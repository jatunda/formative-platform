// This class is a one time use to upload the classes we have. 
// Edit and rerun if you want to upload new classes. (npm path_to_this_file)
// To delete classes, go to firebase console, the database,
// and manually delete classes in the database under /classes/

const admin = require("firebase-admin");
const serviceAccount = require("../firebase-service-account.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://formative-platform-default-rtdb.firebaseio.com/",
});

const db = admin.database();
const classesRef = db.ref("classes");

const classList = {
  csa: { name: "AP Computer Science A", displayOrder: 1 },
  csp: { name: "AP Computer Science Principles", displayOrder: 2 },
  engr7: { name: "7th Grade Wheel (Engineering)", displayOrder: 3 },
  engr8: { name: "8th Grade Engineering", displayOrder: 4 },
};

(async () => {
  for (const id of Object.keys(classList)) {
    await classesRef.child(id).set(classList[id]);
    console.log(`Uploaded class: ${id}`);
  }
  process.exit(0)
})();
