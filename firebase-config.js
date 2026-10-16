// Firebase web config (public by design; access is enforced by firestore.rules).
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyDKKmHW0BGLllplDs4pI8IgGWcXPAJES34",
  authDomain: "vietnam-trip-10761.firebaseapp.com",
  projectId: "vietnam-trip-10761",
  storageBucket: "vietnam-trip-10761.firebasestorage.app",
  messagingSenderId: "575576783814",
  appId: "1:575576783814:web:ba254f408f91cc9ca150c7"
};

// Local testing: on localhost (or with ?emu=1 on any other non-live host) talk to the Firebase emulators
// started by `firebase emulators:start`. The live site (*.github.io) never connects to them.
window.TRIP_EMU = !/github\.io$/.test(location.hostname)
  && (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) || new URLSearchParams(location.search).has('emu'));
window.connectTripEmulator = function () {
  if (!window.TRIP_EMU) return;
  firebase.auth().useEmulator('http://127.0.0.1:9199', { disableWarnings: true });
  firebase.firestore().useEmulator('127.0.0.1', 8080);
  console.info('[trip] using the local Firebase emulators');
};
