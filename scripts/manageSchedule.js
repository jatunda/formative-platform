// This file provides CLI functions for manipulating the schedule in the database. 
// to use: `node path_to_this_file action args...`
// examples:
// node scripts/manageSchedule.js show csp

const {
  fetchClassSchedule,
  insertPage,
  deletePage,
  movePage
} = require("./scheduleTools");

(async () => {
  const args = process.argv.slice(2);
  const action = args[0];

  if (action === "show") {
    const classId = args[1];
    const schedule = await fetchClassSchedule(classId);
    console.log(`Schedule for ${classId}:`);
    Object.keys(schedule)
      .sort((a, b) => a - b)
      .forEach(day => {
        console.log(`Day ${day}: ${schedule[day].join(", ")}`);
      });
  }

  if (action === "insert") {
    const [_, classId, dayIndex, pageId, optionalPos] = args;
    await insertPage(classId, Number(dayIndex), pageId, optionalPos ? Number(optionalPos) : null);
    console.log(`Inserted ${pageId} into ${classId}, day ${dayIndex}`);
  }

  if (action === "delete") {
    const [_, classId, dayIndex, pageIndex] = args;
    await deletePage(classId, Number(dayIndex), Number(pageIndex));
    console.log(`Deleted page ${pageIndex} from ${classId}, day ${dayIndex}`);
  }

  if (action === "move") {
    const [_, classId, fromDay, fromIndex, toDay, toIndex] = args;
    await movePage(classId, Number(fromDay), Number(fromIndex), Number(toDay), Number(toIndex));
    console.log(`Moved from ${fromDay}:${fromIndex} → ${toDay}:${toIndex}`);
  }
})();
