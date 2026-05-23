# Documentation: Configuration Twilio et Firebase (WhatsApp & SMS)

Si la connexion WhatsApp "tourne en boucle" sans se connecter, ou si les SMS ne s'envoient pas en production (live), c'est généralement lié à un problème de configuration des variables d'environnement (secrets) côté Firebase Cloud Functions.

## 1. Comment configurer les secrets Twilio dans Firebase ?

Firebase Functions v2 utilise **Google Cloud Secret Manager** pour gérer les clés de sécurité. Tu ne peux pas juste mettre un fichier `.env` sur ton serveur de production, tu dois "pousser" tes secrets directement dans Firebase via ton terminal.

Voici la liste des variables que la Cloud Function attend :
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_WHATSAPP_NUMBER` (pour les messages WhatsApp, ex: `whatsapp:+1234567890`)
- `TWILIO_SMS_NUMBER` (pour les SMS classiques, ex: `+1234567890`)
- `LEMON_SQUEEZY_WEBHOOK_SECRET` (si utilisé)

### Les étapes à suivre dans ton terminal :

1. Ouvre ton terminal dans le dossier racine de ton projet (là où se trouve `firebase.json`).
2. Tape la commande suivante pour le premier secret :
   ```bash
   firebase functions:secrets:set TWILIO_ACCOUNT_SID
   ```
3. Le terminal va te demander d'entrer la valeur :
   `? Enter a value for TWILIO_ACCOUNT_SID [hidden]`
   👉 **Copie-colle la valeur de ton Account SID SANS les guillemets (`""`)**. Si ton SID est `AC123456...`, colle juste `AC123456...` puis appuie sur Entrée.

4. Fais exactement la même chose pour les autres variables :
   ```bash
   firebase functions:secrets:set TWILIO_AUTH_TOKEN
   # Colle ton Auth Token (SANS guillemets)

   firebase functions:secrets:set TWILIO_WHATSAPP_NUMBER
   # Colle ton numéro WhatsApp Twilio (ex: whatsapp:+14155238886) SANS guillemets
   
   firebase functions:secrets:set TWILIO_SMS_NUMBER
   # Colle ton numéro d'envoi SMS Twilio (ex: +14155238886) SANS guillemets
   ```

## 2. Avec ou sans guillemets ("") ?

- **Dans le terminal (commande `firebase functions:secrets:set`)** : Ne mets **AUCUN guillemet**. Si tu mets des guillemets, Firebase va penser qu'ils font partie de ta clé, ce qui provoquera une erreur d'authentification chez Twilio !
- **Dans le fichier `.env` ou `.env.local` (pour le développement local)** : Tu peux les mettre sans guillemets, c'est plus sûr. Exemple :
  ```env
  TWILIO_ACCOUNT_SID=AC123456789...
  TWILIO_AUTH_TOKEN=abcd123456...
  TWILIO_WHATSAPP_NUMBER=+14155238886
  ```

## 3. Redéployer les fonctions

Une fois que tu as configuré tous ces secrets dans Firebase, **tu dois obligatoirement redéployer tes fonctions** pour qu'elles aient accès aux nouvelles clés.

Dans ton terminal, lance :
```bash
npm run deploy --prefix functions
# ou
firebase deploy --only functions
```

Une fois le déploiement terminé, le listener WhatsApp et l'envoi de SMS fonctionneront en production !