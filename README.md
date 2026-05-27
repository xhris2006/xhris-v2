# XHRIS MD V2

Bot WhatsApp Multi-Device avec systeme de fallback API et 200+ commandes.

## Deploiement

[XHRIS HOST](https://xhrishost.site) - Hebergeur Premium des bots WhatsApp

## Chaine

https://whatsapp.com/channel/0029Vark1I1AYlUR1G8YMX31

## Variables

- `SESSION_ID` - Session XHRIS-MD!...
- `OWNER_NUMBER` - Votre numero

## Architecture API

Le bot utilise 4 APIs en cascade (fallback automatique) :
1. `api.princetechn.com` (primaire)
2. `api.giftedtech.web.id` (fallback 1)
3. `api.davidcyriltech.my.id` (fallback 2)
4. `api.dreaded.site` (fallback 3)

Si une API tombe, le bot bascule automatiquement.

## Credits

Fork de PRINCE-MDX par Prince Tech. Refondu par XHRIS TECH.
