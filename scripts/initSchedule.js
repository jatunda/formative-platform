const admin = require("firebase-admin");
const serviceAccount = require("../firebase-service-account.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://formative-platform-default-rtdb.firebaseio.com/",
});

const db = admin.database();
const scheduleRef = db.ref("schedule");

const testSchedule = {
  csa: {
    0: ["-OWiUu1KtMb9wDt3WvYP", "-OWic-FrEGCGAo8lPhac"],
    1: ["-OWic-5eHPQAiUB_VlVn"],
  },
  csp: {
    0: ["-OWic-7h91N54w-m54Nn"],
    1: [],
  },
  engr7: {
    0: [],
    1: ["-OWic-9h8BSex5Q_Wf36"],
  },
  engr8: {
    0: ["-OWic-BlT2uIyzb146_n"],
	2: ["-OWic-DpNLIHHrqmjA0V", "-OWic-FrEGCGAo8lPhac"],
  }
};

(async () => {
  await scheduleRef.set(testSchedule);
  console.log("Test schedule uploaded.");
})();
