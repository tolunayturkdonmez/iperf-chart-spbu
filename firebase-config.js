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

  try {
    const snapshot = await db.collection(MODELS_COLLECTION).get();
    const existingModels = new Set(snapshot.docs.map(doc => doc.id));
    const missingDefaults = defaults.filter(d => !existingModels.has(d));
    
    if (missingDefaults.length > 0) {
      try {
        const batch = db.batch();
        for (const m of missingDefaults) {
          const ref = db.collection(MODELS_COLLECTION).doc(m);
          batch.set(ref, {
            firmwares: m === 'VX231' ? ['250505', '250601'] : [],
            createdAt: new Date().toISOString()
          });
        }
        await batch.commit();
      } catch (writeErr) {
        console.warn("Could not write missing default models (probably read-only rules):", writeErr);
      }
      
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
  } catch (readErr) {
    console.error("Error reading models collection:", readErr);
    // Fallback to local defaults if DB read completely fails
    return defaults.map(m => ({
      id: m,
      firmwares: m === 'VX231' ? ['250505', '250601'] : []
    }));
  }
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
  await ref.set({
    firmwares: firebase.firestore.FieldValue.arrayUnion(cleanedFirmware)
  }, { merge: true });
}

/**
 * Delete a firmware version from a specific model
 * @param {string} modelName 
 * @param {string} firmware 
 */
async function deleteFirmwareFromModel(modelName, firmware) {
  const ref = db.collection(MODELS_COLLECTION).doc(modelName);
  await ref.set({
    firmwares: firebase.firestore.FieldValue.arrayRemove(firmware)
  }, { merge: true });
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

// ===== Testlink Firestore Collections & CRUD Metotları =====

const TESTLINK_FIRMWARES_COLLECTION = 'testlink_firmwares';
const TESTLINK_TEMPLATES_COLLECTION = 'testlink_templates';
const TESTLINK_RESULTS_COLLECTION = 'testlink_results';

/**
 * Gets all Testlink firmwares from Firestore.
 * If empty, or if using the old schema, it triggers seeding.
 */
async function getTestlinkFirmwares() {
  try {
    const snapshot = await db.collection(TESTLINK_FIRMWARES_COLLECTION).get();
    
    // Reseed if empty or if containing old model names (with "TP-Link " prefix)
    const hasOldModels = snapshot.docs.some(doc => {
      const model = doc.data().model;
      return model && model.startsWith('TP-Link ');
    });

    const templatesSnapshot = await db.collection(TESTLINK_TEMPLATES_COLLECTION).limit(1).get();
    const needsReseed = snapshot.empty || hasOldModels || templatesSnapshot.empty;

    if (needsReseed) {
      try {
        await seedTestlinkDataIfEmpty();
      } catch (writeErr) {
        console.warn("Could not reseed Testlink database:", writeErr);
      }
      const newSnapshot = await db.collection(TESTLINK_FIRMWARES_COLLECTION).get();
      return newSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (readErr) {
    console.error("Error reading Testlink firmwares:", readErr);
    // Fallback to local defaults if DB read fails
    return [
      { id: 'EX520v_240620', model: 'EX520v', firmware: '240620', releaseDate: '2024-06-20', buildNo: 'Build 240620.Rel2900', createdBy: 'admin@tp-link.com', description: 'HGW Cihazı stabil sürümü.', status: 'In Progress' },
      { id: 'Archer_C5v_240420', model: 'Archer C5v', firmware: '240420', releaseDate: '2024-04-20', buildNo: 'Build 240420.Rel1204', createdBy: 'admin@tp-link.com', description: 'HGW Cihazı GPON Gateway yazılımı.', status: 'In Progress' },
      { id: 'EX20v_240520', model: 'EX20v', firmware: '240520', releaseDate: '2024-05-20', buildNo: 'Build 240520.Rel1890', createdBy: 'admin@tp-link.com', description: 'HGW Cihazı performans sürümü.', status: 'In Progress' },
      { id: 'VC220-G3u_2.0.0', model: 'VC220-G3u', firmware: '2.0.0', releaseDate: '2024-02-15', buildNo: 'Build 240215.Rel0299', createdBy: 'admin@tp-link.com', description: 'DSL Cihazı VDSL2/ADSL2+ stabil yazılımı.', status: 'In Progress' },
      { id: 'VX231_1.0.4', model: 'VX231', firmware: '1.0.4', releaseDate: '2024-05-10', buildNo: 'Build 240510.Rel4490', createdBy: 'admin@tp-link.com', description: 'DSL Cihazı yeni nesil modem sürümü.', status: 'In Progress' },
      { id: 'HX520_3.0.0', model: 'HX520', firmware: '3.0.0', releaseDate: '2024-03-01', buildNo: 'Build 240301.Rel0988', createdBy: 'admin@tp-link.com', description: 'Mesh Cihazı kapsama genişletici yazılımı.', status: 'In Progress' },
      { id: 'NX540_1.2.0', model: 'NX540', firmware: '1.2.0', releaseDate: '2024-04-10', buildNo: 'Build 240410.Rel8831', createdBy: 'admin@tp-link.com', description: '5G FWA Cihazı SIM kartlı router yazılımı.', status: 'In Progress' }
    ];
  }
}

/**
 * Adds a new Testlink firmware document.
 */
async function addTestlinkFirmware(entry) {
  const id = `${entry.model.replace(/\s+/g, '_')}_${entry.firmware.replace(/\s+/g, '_')}`;
  const ref = db.collection(TESTLINK_FIRMWARES_COLLECTION).doc(id);
  
  await ref.set({
    model: entry.model,
    firmware: entry.firmware,
    releaseDate: entry.releaseDate || new Date().toISOString().split('T')[0],
    buildNo: entry.buildNo || 'Build 1.0.0',
    createdBy: entry.createdBy || auth.currentUser?.email || 'System',
    description: entry.description || '',
    status: entry.status || 'In Progress',
    createdAt: new Date().toISOString()
  });

  return id;
}

/**
 * Deletes a Testlink firmware and all its execution results.
 */
async function deleteTestlinkFirmware(firmwareId) {
  await db.collection(TESTLINK_FIRMWARES_COLLECTION).doc(firmwareId).delete();
  
  const resultsSnapshot = await db.collection(TESTLINK_RESULTS_COLLECTION)
    .where('firmwareId', '==', firmwareId)
    .get();
    
  if (!resultsSnapshot.empty) {
    const batch = db.batch();
    resultsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  }
}

/**
 * Helper to determine device type category for a given model name.
 */
function getDeviceTypeForModel(modelName) {
  if (['Archer C5v', 'EX20v', 'EX520v'].includes(modelName)) {
    return 'HGW Cihazları';
  }
  if (['VC220-G3u', 'VX231'].includes(modelName)) {
    return 'DSL Cihazları';
  }
  if (['HX520'].includes(modelName)) {
    return 'Mesh Cihazları';
  }
  if (['NX540'].includes(modelName)) {
    return '5G FWA Cihazları';
  }
  return 'HGW Cihazları'; // fallback
}

/**
 * Gets template test cases for a specific device category.
 */
async function getCategoryTemplates(deviceType) {
  try {
    const snapshot = await db.collection(TESTLINK_TEMPLATES_COLLECTION)
      .where('deviceType', '==', deviceType)
      .get();
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    console.error("Error reading templates:", err);
    // Return static fallback templates
    const mockTemplates = {
      'HGW Cihazları': [
        { testSuite: 'WiFi Performansı', priority: 'High', testCase: '5GHz throughput testi (80MHz)', description: 'Router 5GHz modunda 80MHz band genişliğinde iPerf throughput testi çalıştırılır. Minimum 600 Mbps hız gözlemlenmelidir.' },
        { testSuite: 'Ağ Bağlantısı', priority: 'High', testCase: 'IPv6 SLAAC adres alımı ve ping testi', description: 'İstemci cihazın IPv6 SLAAC protokolüyle IPv6 adresi alabildiği ve Google DNS IPv6 adresine başarıyla ping atabildiği doğrulanır.' },
        { testSuite: 'Güvenlik Protokolleri', priority: 'Medium', testCase: 'WPA3-SAE bağlantı ve el sıkışma kararlılığı', description: 'Güvenlik ayarlarında WPA3-SAE şifreleme seçilir. İstemcinin sorunsuz şekilde bağlanıp en az 1 saat bağlantıda kaldığı gözlemlenir.' },
        { testSuite: 'VLAN Ayarları', priority: 'Medium', testCase: 'LAN Port 4 IPTV VLAN köprüleme', description: 'LAN port 4 IPTV portu olarak konfigüre edilir. IPTV kutusu bağlanarak yayının IGMP multicast trafiğini kesintisiz alabildiği doğrulanır.' }
      ],
      'DSL Cihazları': [
        { testSuite: 'Modem Bağlantısı', priority: 'High', testCase: 'VDSL2/ADSL2+ otomatik algılama', description: 'DSL hattı bağlanır, modemin VDSL2 ve ADSL2+ modülasyonlarını otomatik algılayıp DSL senkronizasyonu sağladığı kontrol edilir.' },
        { testSuite: 'Güvenlik Duvarı', priority: 'Low', testCase: 'WAN Portundan ping isteklerini engelleme', description: 'Güvenlik duvarı ayarlarında "Block WAN Ping" seçeneği aktif edilir. Dış IP üzerinden WAN portuna atılan pinglerin engellendiği görülür.' },
        { testSuite: 'Ses Hizmetleri (VoIP)', priority: 'High', testCase: 'SIP kaydı ve VoIP arama testi', description: 'SIP sunucu bilgileri girilerek telefon hattının "Registered" statüsüne geçtiği ve yapılan sesli aramada ses kalitesinin berrak olduğu doğrulanır.' }
      ],
      'Mesh Cihazları': [
        { testSuite: 'Mesh Kurulumu', priority: 'High', testCase: 'EasyMesh uydu düğümü senkronizasyonu', description: 'Ana router ile uydu cihazı EasyMesh butonuna basılarak eşleştirilir. Arayüzde ağ topolojisinin düzgün şekilde listelendiği kontrol edilir.' },
        { testSuite: 'Dolaşım (Roaming)', priority: 'High', testCase: '802.11k/v/r aktif roaming geçiş hızı', description: 'İstemci cihaz AP\'ler arasında hareket ettirilirken ses/video akışlarında kopma olmadan <100ms sürede geçiş yaptığı doğrulanır.' }
      ],
      '5G FWA Cihazları': [
        { testSuite: 'SIM Kart / Mobil', priority: 'High', testCase: '5G Mobil veri bağlantısı testi', description: 'Cihaza uyumlu bir 5G SIM kart takılır. APN profilinin otomatik alındığı ve 5G veri oturumunun kurulduğu doğrulanır.' },
        { testSuite: 'Servis Kalitesi (QoS)', priority: 'Medium', testCase: 'Misafir Ağı hız sınırlama kuralı', description: 'Misafir ağı için upload/download hız limiti 10 Mbps olarak tanımlanır. Bağlanan istemcide yapılan hız testinde bu limitin aşılmadığı test edilir.' }
      ]
    };
    const list = mockTemplates[deviceType] || [];
    return list.map((tc, idx) => ({
      id: `${deviceType.replace(/\s+/g, '_')}_TC-${String(idx + 1).padStart(3, '0')}`,
      deviceType: deviceType,
      testId: `TC-${String(idx + 1).padStart(3, '0')}`,
      testSuite: tc.testSuite,
      priority: tc.priority,
      testCase: tc.testCase,
      description: tc.description
    }));
  }
}

/**
 * Gets execution results for a specific firmware.
 */
async function getFirmwareResults(firmwareId) {
  try {
    const snapshot = await db.collection(TESTLINK_RESULTS_COLLECTION)
      .where('firmwareId', '==', firmwareId)
      .get();
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    console.error("Error reading firmware results:", err);
    return [];
  }
}

/**
 * Updates a test result for a specific firmware & test case template.
 */
async function updateFirmwareTestCaseResult(firmwareId, testId, result, comment, tester) {
  const docId = `${firmwareId}_${testId}`;
  const ref = db.collection(TESTLINK_RESULTS_COLLECTION).doc(docId);
  const doc = await ref.get();
  
  let currentData = doc.exists ? doc.data() : { result: 'Not Run', comment: '', attachments: [], history: [] };
  const history = currentData.history || [];
  
  const userEmail = tester || auth.currentUser?.email || 'System';
  const timestamp = new Date().toISOString().split('T')[0] + ' ' + new Date().toTimeString().split(' ')[0];
  
  if (currentData.result !== result) {
    history.push({
      date: timestamp,
      user: userEmail,
      action: `Sonuç değiştirildi: ${currentData.result || 'Not Run'} ➔ ${result}`
    });
  }
  if (currentData.comment !== comment) {
    history.push({
      date: timestamp,
      user: userEmail,
      action: `Yorum güncellendi.`
    });
  }

  await ref.set({
    firmwareId: firmwareId,
    testId: testId,
    result: result,
    comment: comment || '',
    tester: userEmail,
    updatedAt: new Date().toISOString(),
    attachments: currentData.attachments || [],
    history: history
  }, { merge: true });
}

/**
 * Adds attachment to a test result for a specific firmware & test case.
 */
async function addTestCaseAttachment(firmwareId, testId, fileName, fileDataUrl) {
  const docId = `${firmwareId}_${testId}`;
  const ref = db.collection(TESTLINK_RESULTS_COLLECTION).doc(docId);
  const doc = await ref.get();
  
  let attachments = [];
  if (doc.exists && doc.data().attachments) {
    attachments = doc.data().attachments;
  }
  
  attachments.push({
    name: fileName,
    url: fileDataUrl, // base64 URL format
    date: new Date().toISOString().split('T')[0]
  });

  await ref.set({
    firmwareId: firmwareId,
    testId: testId,
    attachments: attachments
  }, { merge: true });
}

/**
 * Uploads Excel parsed templates bulk for a specific deviceType.
 * Wipes out existing templates for that category first.
 */
async function uploadCategoryTemplateBulk(deviceType, casesList) {
  // Wipe out existing templates for this category
  const oldTemplates = await db.collection(TESTLINK_TEMPLATES_COLLECTION)
    .where('deviceType', '==', deviceType)
    .get();
    
  if (!oldTemplates.empty) {
    const wipeBatch = db.batch();
    oldTemplates.docs.forEach(d => wipeBatch.delete(d.ref));
    await wipeBatch.commit();
  }

  // Upload new ones
  const batch = db.batch();
  casesList.forEach((c, index) => {
    const testId = `TC-${String(index + 1).padStart(3, '0')}`;
    const docId = `${deviceType.replace(/\s+/g, '_')}_${testId}`;
    const ref = db.collection(TESTLINK_TEMPLATES_COLLECTION).doc(docId);
    
    batch.set(ref, {
      deviceType: deviceType,
      testId: testId,
      testSuite: c.testSuite || 'Genel',
      priority: c.priority || 'Medium',
      testCase: c.testCase || 'Verify feature',
      description: c.description || '' // Excel'deki "Açıklama"
    });
  });

  await batch.commit();
}

/**
 * Seed database with categories, templates, and execution results on first load.
 */
async function seedTestlinkDataIfEmpty() {
  console.log("Re-seeding Testlink database in category template layout...");

  // Wipe EVERYTHING related to testlink to prevent leftovers
  const oldFws = await db.collection(TESTLINK_FIRMWARES_COLLECTION).get();
  if (!oldFws.empty) {
    const batch = db.batch();
    oldFws.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  }
  const oldCases = await db.collection('testlink_cases').get();
  if (!oldCases.empty) {
    const batch = db.batch();
    oldCases.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  }
  const oldTemplates = await db.collection(TESTLINK_TEMPLATES_COLLECTION).get();
  if (!oldTemplates.empty) {
    const batch = db.batch();
    oldTemplates.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  }
  const oldResults = await db.collection(TESTLINK_RESULTS_COLLECTION).get();
  if (!oldResults.empty) {
    const batch = db.batch();
    oldResults.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  }

  // Define device category templates
  const templatesData = {
    'HGW Cihazları': [
      { testSuite: 'WiFi Performansı', priority: 'High', testCase: '5GHz throughput testi (80MHz)', description: 'Router 5GHz modunda 80MHz band genişliğinde iPerf throughput testi çalıştırılır. Minimum 600 Mbps hız gözlemlenmelidir.' },
      { testSuite: 'Ağ Bağlantısı', priority: 'High', testCase: 'IPv6 SLAAC adres alımı ve ping testi', description: 'İstemci cihazın IPv6 SLAAC protokolüyle IPv6 adresi alabildiği ve Google DNS IPv6 adresine başarıyla ping atabildiği doğrulanır.' },
      { testSuite: 'Güvenlik Protokolleri', priority: 'Medium', testCase: 'WPA3-SAE bağlantı ve el sıkışma kararlılığı', description: 'Güvenlik ayarlarında WPA3-SAE şifreleme seçilir. İstemcinin sorunsuz şekilde bağlanıp en az 1 saat bağlantıda kaldığı gözlemlenir.' },
      { testSuite: 'VLAN Ayarları', priority: 'Medium', testCase: 'LAN Port 4 IPTV VLAN köprüleme', description: 'LAN port 4 IPTV portu olarak konfigüre edilir. IPTV kutusu bağlanarak yayının IGMP multicast trafiğini kesintisiz alabildiği doğrulanır.' }
    ],
    'DSL Cihazları': [
      { testSuite: 'Modem Bağlantısı', priority: 'High', testCase: 'VDSL2/ADSL2+ otomatik algılama', description: 'DSL hattı bağlanır, modemin VDSL2 ve ADSL2+ modülasyonlarını otomatik algılayıp DSL senkronizasyonu sağladığı kontrol edilir.' },
      { testSuite: 'Güvenlik Duvarı', priority: 'Low', testCase: 'WAN Portundan ping isteklerini engelleme', description: 'Güvenlik duvarı ayarlarında "Block WAN Ping" seçeneği aktif edilir. Dış IP üzerinden WAN portuna atılan pinglerin engellendiği görülür.' },
      { testSuite: 'Ses Hizmetleri (VoIP)', priority: 'High', testCase: 'SIP kaydı ve VoIP arama testi', description: 'SIP sunucu bilgileri girilerek telefon hattının "Registered" statüsüne geçtiği ve yapılan sesli aramada ses kalitesinin berrak olduğu doğrulanır.' }
    ],
    'Mesh Cihazları': [
      { testSuite: 'Mesh Kurulumu', priority: 'High', testCase: 'EasyMesh uydu düğümü senkronizasyonu', description: 'Ana router ile uydu cihazı EasyMesh butonuna basılarak eşleştirilir. Arayüzde ağ topolojisinin düzgün şekilde listelendiği kontrol edilir.' },
      { testSuite: 'Dolaşım (Roaming)', priority: 'High', testCase: '802.11k/v/r aktif roaming geçiş hızı', description: 'İstemci cihaz AP\'ler arasında hareket ettirilirken ses/video akışlarında kopma olmadan <100ms sürede geçiş yaptığı doğrulanır.' }
    ],
    '5G FWA Cihazları': [
      { testSuite: 'SIM Kart / Mobil', priority: 'High', testCase: '5G Mobil veri bağlantısı testi', description: 'Cihaza uyumlu bir 5G SIM kart takılır. APN profilinin otomatik alındığı ve 5G veri oturumunun kurulduğu doğrulanır.' },
      { testSuite: 'Servis Kalitesi (QoS)', priority: 'Medium', testCase: 'Misafir Ağı hız sınırlama kuralı', description: 'Misafir ağı için upload/download hız limiti 10 Mbps olarak tanımlanır. Bağlanan istemcide yapılan hız testinde bu limitin aşılmadığı test edilir.' }
    ]
  };

  // Seed Templates in batch
  const tempBatch = db.batch();
  for (const catName of Object.keys(templatesData)) {
    const list = templatesData[catName];
    list.forEach((tc, idx) => {
      const testId = `TC-${String(idx + 1).padStart(3, '0')}`;
      const docId = `${catName.replace(/\s+/g, '_')}_${testId}`;
      const ref = db.collection(TESTLINK_TEMPLATES_COLLECTION).doc(docId);
      tempBatch.set(ref, {
        deviceType: catName,
        testId: testId,
        testSuite: tc.testSuite,
        priority: tc.priority,
        testCase: tc.testCase,
        description: tc.description
      });
    });
  }
  await tempBatch.commit();

  // Define Mock Firmwares
  const mockFirmwares = [
    { model: 'EX520v', firmware: '240620', releaseDate: '2024-06-20', buildNo: 'Build 240620.Rel2900', desc: 'HGW Cihazı stabil sürümü.' },
    { model: 'Archer C5v', firmware: '240420', releaseDate: '2024-04-20', buildNo: 'Build 240420.Rel1204', desc: 'HGW Cihazı GPON Gateway yazılımı.' },
    { model: 'EX20v', firmware: '240520', releaseDate: '2024-05-20', buildNo: 'Build 240520.Rel1890', desc: 'HGW Cihazı performans sürümü.' },
    { model: 'VC220-G3u', firmware: '2.0.0', releaseDate: '2024-02-15', buildNo: 'Build 240215.Rel0299', desc: 'DSL Cihazı VDSL2/ADSL2+ stabil yazılımı.' },
    { model: 'VX231', firmware: '1.0.4', releaseDate: '2024-05-10', buildNo: 'Build 240510.Rel4490', desc: 'DSL Cihazı yeni nesil modem sürümü.' },
    { model: 'HX520', firmware: '3.0.0', releaseDate: '2024-03-01', buildNo: 'Build 240301.Rel0988', desc: 'Mesh Cihazı kapsama genişletici yazılımı.' },
    { model: 'NX540', firmware: '1.2.0', releaseDate: '2024-04-10', buildNo: 'Build 240410.Rel8831', desc: '5G FWA Cihazı SIM kartlı router yazılımı.' }
  ];

  // Seed Firmwares and execution results in batch
  for (const fw of mockFirmwares) {
    const fwId = `${fw.model.replace(/\s+/g, '_')}_${fw.firmware.replace(/\s+/g, '_')}`;
    const fwRef = db.collection(TESTLINK_FIRMWARES_COLLECTION).doc(fwId);
    
    await fwRef.set({
      model: fw.model,
      firmware: fw.firmware,
      releaseDate: fw.releaseDate,
      buildNo: fw.buildNo,
      createdBy: 'admin@tp-link.com',
      description: fw.desc,
      status: 'In Progress',
      createdAt: new Date().toISOString()
    });

    const category = getDeviceTypeForModel(fw.model);
    const categoryCases = templatesData[category] || [];

    const resBatch = db.batch();
    categoryCases.forEach((tc, idx) => {
      const testId = `TC-${String(idx + 1).padStart(3, '0')}`;
      const docId = `${fwId}_${testId}`;
      const resRef = db.collection(TESTLINK_RESULTS_COLLECTION).doc(docId);
      
      const resultsList = ['Pass', 'Pass', 'Fail', 'Blocked', 'Not Run'];
      const randomResult = resultsList[(idx + mockFirmwares.indexOf(fw)) % resultsList.length];
      const comment = randomResult === 'Fail' ? 'Handshake başarısız oldu.' : randomResult === 'Blocked' ? 'Cihaz yazılımı bekleniyor.' : '';
      const tester = randomResult !== 'Not Run' ? 'tester@tp-link.com' : '—';

      resBatch.set(resRef, {
        firmwareId: fwId,
        testId: testId,
        result: randomResult,
        tester: tester,
        comment: comment,
        attachments: [],
        history: [{
          date: fw.releaseDate,
          user: 'admin@tp-link.com',
          action: 'Test sonucu oluşturuldu.'
        }],
        updatedAt: new Date().toISOString()
      });
    });
    await resBatch.commit();
  }
  console.log("Category Seeding completed successfully.");
}
