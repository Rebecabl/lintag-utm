// Inicialização do Firebase Admin com múltiplas formas de credencial:
// - FIREBASE_SERVICE_ACCOUNT_JSON (JSON literal)
// - FIREBASE_SERVICE_ACCOUNT_BASE64 (JSON base64)
// - FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY
// - GOOGLE_APPLICATION_CREDENTIALS (caminho do arquivo, útil em dev)
// Se nenhuma for encontrada, tenta initializeApp() padrão (ADC/OAuth).
//
// Emulador Firestore em dev: FIRESTORE_EMULATOR_HOST=127.0.0.1:8081

import admin from "firebase-admin"
import fs from "fs"

const log = (...a) => console.log("[firebase]", ...a)

function getServiceAccount() {
  // 1) JSON em texto (comum em Vercel)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    } catch (e) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON inválido: " + e.message)
    }
  }

  // 2) JSON base64
  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    try {
      const json = Buffer.from(
        process.env.FIREBASE_SERVICE_ACCOUNT_BASE64,
        "base64"
      ).toString("utf8")
      return JSON.parse(json)
    } catch (e) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_BASE64 inválido: " + e.message)
    }
  }

  // 3) Trio de variáveis
  if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  ) {
    return {
      project_id: process.env.FIREBASE_PROJECT_ID,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: process.env.FIREBASE_PRIVATE_KEY,
    }
  }

  // 4) Caminho para arquivo (dev/local)
  if (
    process.env.GOOGLE_APPLICATION_CREDENTIALS &&
    fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)
  ) {
    const json = fs.readFileSync(
      process.env.GOOGLE_APPLICATION_CREDENTIALS,
      "utf8"
    )
    return JSON.parse(json)
  }

  // Sem credenciais explícitas → ADC
  return null
}

if (!admin.apps.length) {
  const sa = getServiceAccount()

  if (!sa) {
    // Sem credenciais explícitas: tenta ADC
    log("⚠️ Credenciais não encontradas; tentando initializeApp() padrão")
    admin.initializeApp()
  } else {
    const projectId = sa.project_id || sa.projectId
    const clientEmail = sa.client_email || sa.clientEmail
    // Normaliza quebras de linha em private_key
    const privateKey = (sa.private_key || sa.privateKey || "").replace(/\\n/g, "\n")

    log("init com service account (projectId:", projectId, ")")
    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      projectId,
    })
  }
}

// Emulador local do Firestore (se definido)
if (process.env.FIRESTORE_EMULATOR_HOST) {
  log("🔥 Usando Firestore Emulator:", process.env.FIRESTORE_EMULATOR_HOST)
}

export const db = admin.firestore()
// Ignora undefined nos objetos (evita erros no Firestore)
db.settings({ ignoreUndefinedProperties: true })

export const auth = admin.auth()
export default admin
