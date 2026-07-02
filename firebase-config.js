// Firebase Configuration & Initialization
// Using Firebase Compat SDK for vanilla JS

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

// Firestore & Storage references
const db = firebase.firestore();
const storage = firebase.storage();

// Collection name
const COLLECTION_NAME = 'testResults';

// ===== Firestore Helper Functions =====

/**
 * Save test result to Firestore + upload image to Storage
 * @param {Object} entry - { image (base64), model, firmware, band, channel, avg, max, min, duration, fileName }
 * @returns {Promise<string>} Document ID
 */
async function saveTestResult(entry) {
  // 1. Convert base64 to Blob and upload to Storage
  const blob = base64ToBlob(entry.image, 'image/png');
  const timestamp = Date.now();
  const storagePath = `images/${timestamp}_${entry.fileName}.png`;
  const storageRef = storage.ref(storagePath);

  const snapshot = await storageRef.put(blob);
  const imageUrl = await snapshot.ref.getDownloadURL();

  // 2. Save metadata to Firestore (without base64 image)
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
    imageUrl: imageUrl,
    storagePath: storagePath,
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
 * Delete a single test result from Firestore + Storage
 * @param {string} docId - Firestore document ID
 * @param {string} storagePath - Storage file path
 */
async function deleteTestResult(docId, storagePath) {
  // Delete from Firestore
  await db.collection(COLLECTION_NAME).doc(docId).delete();

  // Delete from Storage
  if (storagePath) {
    try {
      await storage.ref(storagePath).delete();
    } catch (e) {
      console.warn('Storage silme hatası (dosya zaten silinmiş olabilir):', e);
    }
  }
}

/**
 * Delete ALL test results from Firestore + Storage
 */
async function deleteAllTestResults() {
  const snapshot = await db.collection(COLLECTION_NAME).get();
  const batch = db.batch();
  const storageDeletes = [];

  snapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
    const data = doc.data();
    if (data.storagePath) {
      storageDeletes.push(
        storage.ref(data.storagePath).delete().catch(() => {})
      );
    }
  });

  await batch.commit();
  await Promise.all(storageDeletes);
}

/**
 * Convert base64 data URL to Blob
 */
function base64ToBlob(base64, contentType) {
  const parts = base64.split(',');
  const byteString = atob(parts[1]);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: contentType });
}
