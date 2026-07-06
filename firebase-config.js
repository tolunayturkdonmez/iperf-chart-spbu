// Firebase Configuration & Initialization
// Using Firebase Compat SDK for vanilla JS
// Images stored as base64 directly in Firestore (no Storage needed, avoids CORS)

const firebaseConfig = {
  apiKey: "AIzaSyAjuuGn9zDoGJ64tufoziPQPiRTUXR9boo",
  authDomain: "iperf-chart.firebaseapp.com",
  projectId: "iperf-chart",
  storageBucket: "iperf-chart.firebasestorage.app",
  messagingSenderId: "391448193106",
  appId: "1:391448193106:web:008cd1250c0bff52aed78b"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Firestore & Auth references
const db = firebase.firestore();
const auth = firebase.auth();

// Validate if email belongs to tp-link domain
function isTPLinkEmail(email) {
  return /@tp-link\.[a-zA-Z0-9.-]+$/i.test(email);
}

// ===== Session Timeout (Inactivity Tracker for 5 mins - LocalStorage persisted) =====
function getStoredLastActivity() {
  return parseInt(localStorage.getItem('lastActivity') || '0', 10);
}

function updateLastActivity() {
  localStorage.setItem('lastActivity', Date.now().toString());
}

function checkSessionTimeout() {
  if (window.location.pathname.endsWith('login.html')) return;
  
  const lastActivity = getStoredLastActivity();
  const now = Date.now();
  
  // If user is logged in and last activity is older than 5 minutes, force logout
  if (lastActivity && (now - lastActivity) > 5 * 60 * 1000) {
    localStorage.removeItem('lastActivity');
    if (auth.currentUser) {
      auth.signOut().then(() => {
        window.location.href = 'login.html?error=timeout';
      });
    }
  }
}

// Check session timeout immediately on load
checkSessionTimeout();

// Check periodically every 5 seconds
setInterval(checkSessionTimeout, 5000);

// Only track activity if not on login page
if (!window.location.pathname.endsWith('login.html')) {
  // Update last activity immediately on load
  updateLastActivity();
  
  const activityEvents = ['mousemove', 'mousedown', 'keypress', 'touchstart', 'scroll', 'click'];
  activityEvents.forEach(evt => {
    document.addEventListener(evt, () => {
      updateLastActivity();
      checkSessionTimeout();
    }, { passive: true });
  });
}

// Collection name
const COLLECTION_NAME = 'testResults';

// ===== Firestore Helper Functions =====

/**
 * Save test result to Firestore (image stored as base64 in document)
 * @param {Object} entry - { image (base64), model, firmware, band, channel, avg, max, min, duration, fileName }
 * @returns {Promise<string>} Document ID
 */
async function saveTestResult(entry) {
  const currentUserEmail = auth.currentUser ? auth.currentUser.email : '—';
  
  const docData = {
    model: entry.model || '—',
    firmware: entry.firmware || '—',
    band: entry.band || '—',
    channel: entry.channel || '—',
    avg: entry.avg || '—',
    max: entry.max || '—',
    min: entry.min || '—',
    duration: entry.duration || '—',
    fileName: entry.fileName || 'iperf_throughput',
    image: entry.image,  // base64 PNG stored directly
    savedBy: currentUserEmail, // Track who saved it
    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    createdAt: new Date().toISOString()
  };

  const docRef = await db.collection(COLLECTION_NAME).add(docData);
  return docRef.id;
}

/**
 * Get all test results from Firestore, ordered by timestamp desc
 * @returns {Promise<Array>} Array of { id, ...data }
 */
async function getAllTestResults() {
  const snapshot = await db.collection(COLLECTION_NAME)
    .orderBy('timestamp', 'desc')
    .get();

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

/**
 * Delete a single test result from Firestore
 * @param {string} docId - Firestore document ID
 */
async function deleteTestResult(docId) {
  await db.collection(COLLECTION_NAME).doc(docId).delete();
}

/**
 * Delete ALL test results from Firestore
 */
async function deleteAllTestResults() {
  const snapshot = await db.collection(COLLECTION_NAME).get();

  // Firestore batch limit is 500, use multiple batches if needed
  const batchSize = 500;
  const docs = snapshot.docs;

  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = db.batch();
    const chunk = docs.slice(i, i + batchSize);
    chunk.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  }
}

/**
 * Re-authenticates the current user with their current password and updates it to the new password.
 * @param {string} currentPassword 
 * @param {string} newPassword 
 */
async function changeUserPassword(currentPassword, newPassword) {
  const user = auth.currentUser;
  if (!user) throw new Error("Oturum açmış kullanıcı bulunamadı.");
  
  const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
  
  // 1. Re-authenticate
  await user.reauthenticateWithCredential(credential);
  
  // 2. Update password
  await user.updatePassword(newPassword);
}

const MODELS_COLLECTION = 'device_models';

/**
 * Gets all models and their firmware versions.
 * If the collection is empty, populates it with some defaults.
 * @returns {Promise<Array>} List of { id (name), firmwares: [] }
 */
async function getAllModels() {
  const snapshot = await db.collection(MODELS_COLLECTION).get();
  const existingModels = new Set(snapshot.docs.map(doc => doc.id));
  
  const defaults = [
    "Archer C5v",
    "EB230v",
    "EB810v Generic",
    "EB810v TRTC",
    "EB810v TRTT",
    "EC220-F5",
    "EC220-G5",
    "EX141",
    "EX141 (TR)",
    "EX20v",
    "EX520v",
    "EX530v TRTC",
    "HB210 Pro",
    "HC220-G5",
    "HX220",
    "HX520",
    "NB450",
    "NX540 (TRTT)",
    "VC220-G2u",
    "VC220-G3u (TRMLC)",
    "VC220-G3u (TRTS)",
    "VC220-G3u (TRTT)",
    "VX220-G2u",
    "VX231",
    "XC220-G3",
    "XC220-G3v",
    "XN020-G3",
    "XX230v",
    "XX530",
    "XX530 v2",
    "XX530 v2 (TR)",
    "XX530v",
    "XX535"
  ];
  
  const missingDefaults = defaults.filter(d => !existingModels.has(d));
  
  if (missingDefaults.length > 0) {
    const batch = db.batch();
    for (const m of missingDefaults) {
      const ref = db.collection(MODELS_COLLECTION).doc(m);
      batch.set(ref, {
        firmwares: m === 'VX231' ? ['250505', '250601'] : [],
        createdAt: new Date().toISOString()
      });
    }
    await batch.commit();
    
    // Fetch updated list from Firestore
    const updatedSnapshot = await db.collection(MODELS_COLLECTION).get();
    return updatedSnapshot.docs.map(doc => ({
      id: doc.id,
      firmwares: doc.data().firmwares || []
    }));
  }
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    firmwares: doc.data().firmwares || []
  }));
}

/**
 * Add a new model to Firestore
 * @param {string} modelName 
 */
async function addModel(modelName) {
  const cleanedName = modelName.trim();
  if (!cleanedName) throw new Error("Model ismi boş olamaz.");
  
  const ref = db.collection(MODELS_COLLECTION).doc(cleanedName);
  const doc = await ref.get();
  if (doc.exists) {
    throw new Error("Bu model zaten tanımlı.");
  }
  
  await ref.set({
    firmwares: [],
    createdAt: new Date().toISOString()
  });
}

/**
 * Delete a model from Firestore
 * @param {string} modelName 
 */
async function deleteModel(modelName) {
  await db.collection(MODELS_COLLECTION).doc(modelName).delete();
}

/**
 * Add a firmware version to a specific model
 * @param {string} modelName 
 * @param {string} firmware 
 */
async function addFirmwareToModel(modelName, firmware) {
  const cleanedFirmware = firmware.trim();
  if (!cleanedFirmware) throw new Error("Yazılım sürümü boş olamaz.");
  
  const ref = db.collection(MODELS_COLLECTION).doc(modelName);
  await ref.update({
    firmwares: firebase.firestore.FieldValue.arrayUnion(cleanedFirmware)
  });
}

/**
 * Delete a firmware version from a specific model
 * @param {string} modelName 
 * @param {string} firmware 
 */
async function deleteFirmwareFromModel(modelName, firmware) {
  const ref = db.collection(MODELS_COLLECTION).doc(modelName);
  await ref.update({
    firmwares: firebase.firestore.FieldValue.arrayRemove(firmware)
  });
}

/**
 * Updates a model's name in Firestore, copying existing firmwares and deleting the old record.
 * Also updates any saved test results referencing the old model name.
 * @param {string} oldName 
 * @param {string} newName 
 */
async function updateModelName(oldName, newName) {
  const cleanedOld = oldName.trim();
  const cleanedNew = newName.trim();
  if (!cleanedOld || !cleanedNew) throw new Error("Model isimleri boş olamaz.");
  if (cleanedOld === cleanedNew) return;

  const oldRef = db.collection(MODELS_COLLECTION).doc(cleanedOld);
  const newRef = db.collection(MODELS_COLLECTION).doc(cleanedNew);

  const newDoc = await newRef.get();
  if (newDoc.exists) {
    throw new Error("Bu model zaten tanımlı.");
  }

  const oldDoc = await oldRef.get();
  if (!oldDoc.exists) {
    throw new Error("Güncellenecek model bulunamadı.");
  }

  const data = oldDoc.data();
  // Create new model doc
  await newRef.set(data);
  // Delete old model doc
  await oldRef.delete();

  // Update test results cascadingly
  const resultsSnapshot = await db.collection(COLLECTION_NAME).where('model', '==', cleanedOld).get();
  if (!resultsSnapshot.empty) {
    const batch = db.batch();
    resultsSnapshot.docs.forEach(doc => {
      batch.update(doc.ref, { model: cleanedNew });
    });
    await batch.commit();
  }
}

/**
 * Renames a firmware version inside a model.
 * Also updates any saved test results referencing the old firmware version for this model.
 * @param {string} modelName 
 * @param {string} oldFirmware 
 * @param {string} newFirmware 
 */
async function updateFirmwareName(modelName, oldFirmware, newFirmware) {
  const cleanedOld = oldFirmware.trim();
  const cleanedNew = newFirmware.trim();
  if (!cleanedOld || !cleanedNew) throw new Error("Yazılım sürümü isimleri boş olamaz.");
  if (cleanedOld === cleanedNew) return;

  const ref = db.collection(MODELS_COLLECTION).doc(modelName);
  const doc = await ref.get();
  if (!doc.exists) throw new Error("Model bulunamadı.");
  
  const firmwares = doc.data().firmwares || [];
  const idx = firmwares.indexOf(cleanedOld);
  if (idx === -1) throw new Error("Yazılım sürümü bulunamadı.");

  firmwares[idx] = cleanedNew;
  await ref.update({ firmwares });

  // Update test results cascadingly
  const resultsSnapshot = await db.collection(COLLECTION_NAME)
    .where('model', '==', modelName)
    .where('firmware', '==', cleanedOld)
    .get();
  if (!resultsSnapshot.empty) {
    const batch = db.batch();
    resultsSnapshot.docs.forEach(d => {
      batch.update(d.ref, { firmware: cleanedNew });
    });
    await batch.commit();
  }
}
