const { gmd, config, getSetting, setSetting, getContextInfo } = require("../mayel");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const AdmZip = require("adm-zip");

// Copy folder sync with exclude list
function copyFolderSync(source, destination, excludeList = []) {
  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination, { recursive: true });
  }

  const items = fs.readdirSync(source);

  for (const item of items) {
    const srcPath = path.join(source, item);
    const destPath = path.join(destination, item);
    const relativePath = path.relative(source, srcPath);

    // Skip excluded files/dirs
    if (excludeList.some(ex => relativePath === ex || relativePath.startsWith(ex + path.sep))) {
      continue;
    }

    const stat = fs.statSync(srcPath);

    if (stat.isDirectory()) {
      copyFolderSync(srcPath, destPath, excludeList);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

gmd(
  {
    pattern: "update",
    aliases: ["updatenow", "updt", "sync"],
    react: "🆕",
    description: "Update the bot to the latest version from XHRIS V2 repo",
    category: "owner",
  },
  async (from, Prince, conText) => {
    const { react, reply, isSuperUser, mek, sender, botName, newsletterJid } = conText;

    // Send a message that always carries the channel-forward context.
    const say = async (text) => {
      try {
        await Prince.sendMessage(
          from,
          { text, contextInfo: getContextInfo(sender, newsletterJid, botName) },
          { quoted: mek },
        );
      } catch (e) {
        reply(text);
      }
    };

    if (!isSuperUser) {
      await react("❌");
      return reply("❌ Owner Only Command!");
    }

    try {
      // Repo (configurable via env BOT_REPO)
      const repoName = process.env.BOT_REPO || config.BOT_REPO || "xhris2006/xhris-v2";
      const branch = process.env.BOT_BRANCH || "main";

      // Auth headers — the repo is private, so the token (injected by the host
      // platform via process.env.GITHUB_TOKEN) is required for the API + zip.
      const githubToken = process.env.GITHUB_TOKEN || "";
      const authHeaders = githubToken
        ? { 'User-Agent': 'XHRIS-MD-V2', 'Authorization': `token ${githubToken}` }
        : { 'User-Agent': 'XHRIS-MD-V2' };

      await react("🔍");

      // Fetch the latest commit
      const { data: commitData } = await axios.get(
        `https://api.github.com/repos/${repoName}/commits/${branch}`,
        { headers: authHeaders }
      );

      const latestCommitHash = commitData.sha;
      const currentHash = getSetting("COMMIT_HASH", "");

      if (latestCommitHash === currentHash) {
        await react("✅");
        return say(
          `✅ *Bot is already up to date!*\n\n` +
          `📦 Repo: ${repoName}\n` +
          `🌿 Branch: ${branch}\n` +
          `🔖 Commit: ${latestCommitHash.substring(0, 7)}`
        );
      }

      const authorName = commitData.commit.author.name;
      const commitDate = new Date(commitData.commit.author.date).toLocaleString();
      const commitMessage = commitData.commit.message;
      const shortHash = latestCommitHash.substring(0, 7);

      await say(
        `🔄 *Updating...*\n\n` +
        `📦 Repo: ${repoName}\n` +
        `🌿 Branch: ${branch}\n` +
        `🔖 Commit: ${shortHash}\n` +
        `👤 Author: ${authorName}\n` +
        `📅 Date: ${commitDate}\n` +
        `💬 Message: ${commitMessage}`
      );

      const repoShort = repoName.split("/")[1];
      const zipPath = path.join(__dirname, "..", `${repoShort}.zip`);

      // Télécharger le ZIP via l'endpoint authentifié zipball (repo privé)
      const { data: zipData } = await axios.get(
        `https://api.github.com/repos/${repoName}/zipball/${branch}`,
        {
          responseType: "arraybuffer",
          headers: authHeaders,
          timeout: 120000
        }
      );

      fs.writeFileSync(zipPath, zipData);

      // Extraire le ZIP
      const extractPath = path.join(__dirname, "..", "latest");
      const zip = new AdmZip(zipPath);
      zip.extractAllTo(extractPath, true);

      // Détecter le dossier extrait (zipball le nomme owner-repo-hash, imprévisible)
      const extractedDirs = fs.readdirSync(extractPath).filter((name) => {
        try { return fs.statSync(path.join(extractPath, name)).isDirectory(); }
        catch { return false; }
      });
      if (extractedDirs.length === 0) {
        throw new Error("Dossier extrait introuvable dans l'archive");
      }
      const sourcePath = path.join(extractPath, extractedDirs[0]);
      const destinationPath = path.join(__dirname, "..");

      // Fichiers/dossiers à NE PAS écraser
      const excludeList = [
        ".env",
        "session",
        "config.js",
        "mayel/prince-data.json",
        "mayel/prince.db",
        "node_modules",
        "package-lock.json",
        "data",
        "tmp",
      ];

      // Copier les nouveaux fichiers
      copyFolderSync(sourcePath, destinationPath, excludeList);

      // Save the new hash
      setSetting("COMMIT_HASH", latestCommitHash);

      // Cleanup
      try { fs.unlinkSync(zipPath); } catch {}
      try { fs.rmSync(extractPath, { recursive: true, force: true }); } catch {}

      await say(
        `✅ *Update complete!*\n\n` +
        `🔖 New commit: ${shortHash}\n` +
        `💬 ${commitMessage}\n\n` +
        `🔄 Restarting the bot in 5 seconds...`
      );

      // Restart in 5s
      setTimeout(() => {
        process.exit(0);
      }, 5000);

    } catch (error) {
      console.error("Update error:", error);
      await react("❌");

      let errorMsg = "❌ *Update failed*\n\n";
      if (error.response?.status === 404 || error.response?.status === 401) {
        errorMsg += `The repo ${process.env.BOT_REPO || config.BOT_REPO || "xhris2006/xhris-v2"} could not be accessed (private repo). ` +
          `Make sure GITHUB_TOKEN is set in the container — redeploy the bot if it was added after the bot started.`;
      } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
        errorMsg += "Download timed out. Please try again in a few minutes.";
      } else {
        errorMsg += `Error: ${error.message}\n\nTry redeploying manually on your host.`;
      }

      return say(errorMsg);
    }
  }
);
