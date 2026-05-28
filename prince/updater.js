const { gmd, config, getSetting, setSetting } = require("../mayel");
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
    const { react, reply, isSuperUser } = conText;

    if (!isSuperUser) {
      await react("❌");
      return reply("❌ Owner Only Command!");
    }

    try {
      // Repo XHRIS V2 (configurable via env BOT_REPO)
      const repoName = process.env.BOT_REPO || config.BOT_REPO || "xhris2006/xhris-v2";
      const branch = process.env.BOT_BRANCH || "main";

      await react("🔍");

      // Récupérer le dernier commit
      const { data: commitData } = await axios.get(
        `https://api.github.com/repos/${repoName}/commits/${branch}`,
        { headers: { 'User-Agent': 'XHRIS-MD-V2' } }
      );

      const latestCommitHash = commitData.sha;
      const currentHash = getSetting("COMMIT_HASH", "");

      if (latestCommitHash === currentHash) {
        await react("✅");
        return reply(
          `✅ *Bot déjà à jour !*\n\n` +
          `📦 Repo : ${repoName}\n` +
          `🌿 Branche : ${branch}\n` +
          `🔖 Commit : ${latestCommitHash.substring(0, 7)}`
        );
      }

      const authorName = commitData.commit.author.name;
      const commitDate = new Date(commitData.commit.author.date).toLocaleString();
      const commitMessage = commitData.commit.message;
      const shortHash = latestCommitHash.substring(0, 7);

      await reply(
        `🔄 *Mise à jour en cours...*\n\n` +
        `📦 Repo : ${repoName}\n` +
        `🌿 Branche : ${branch}\n` +
        `🔖 Commit : ${shortHash}\n` +
        `👤 Auteur : ${authorName}\n` +
        `📅 Date : ${commitDate}\n` +
        `💬 Message : ${commitMessage}`
      );

      const repoShort = repoName.split("/")[1];
      const zipPath = path.join(__dirname, "..", `${repoShort}.zip`);

      // Télécharger le ZIP
      const { data: zipData } = await axios.get(
        `https://github.com/${repoName}/archive/${branch}.zip`,
        {
          responseType: "arraybuffer",
          headers: { 'User-Agent': 'XHRIS-MD-V2' },
          timeout: 120000
        }
      );

      fs.writeFileSync(zipPath, zipData);

      // Extraire le ZIP
      const extractPath = path.join(__dirname, "..", "latest");
      const zip = new AdmZip(zipPath);
      zip.extractAllTo(extractPath, true);

      const sourcePath = path.join(extractPath, `${repoShort}-${branch}`);
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

      // Sauvegarder le nouveau hash
      setSetting("COMMIT_HASH", latestCommitHash);

      // Cleanup
      try { fs.unlinkSync(zipPath); } catch {}
      try { fs.rmSync(extractPath, { recursive: true, force: true }); } catch {}

      await reply(
        `✅ *Mise à jour terminée !*\n\n` +
        `🔖 Nouveau commit : ${shortHash}\n` +
        `💬 ${commitMessage}\n\n` +
        `🔄 Redémarrage du bot dans 5 secondes...`
      );

      // Redémarrer dans 5s
      setTimeout(() => {
        process.exit(0);
      }, 5000);

    } catch (error) {
      console.error("Update error:", error);
      await react("❌");

      let errorMsg = "❌ *Mise à jour échouée*\n\n";
      if (error.response?.status === 404) {
        errorMsg += `Le repo ${process.env.BOT_REPO || config.BOT_REPO || "xhris2006/xhris-v2"} est introuvable. Vérifie qu'il est public.`;
      } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
        errorMsg += "Timeout lors du téléchargement. Réessaie dans quelques minutes.";
      } else {
        errorMsg += `Erreur : ${error.message}\n\nEssaie de redéployer manuellement sur xhrishost.site.`;
      }

      return reply(errorMsg);
    }
  }
);
