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

// Collection name
const COLLECTION_NAME = 'testResults';

// ===== Firestore Helper Functions =====

/**
 * Save test result to Firestore (image stored as base64 in document)
 * @param {Object} entry - { image (base64), model, firmware, band, channel, avg, max, min, duration, fileName }
 * @returns {Promise<string>} Document ID
 */
async function saveTestResult(entry) {
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
