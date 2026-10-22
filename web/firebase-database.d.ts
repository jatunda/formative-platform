// Types for the slice of the Firebase Realtime Database SDK that type-checked
// modules import. The SDK loads from gstatic at runtime (and from the test
// double under vitest), so there's no npm package for tsc to read types from.
declare module "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js" {
  export type Database = object;
  export interface DatabaseReference {}
  export interface DataSnapshot {
    exists(): boolean;
    val(): any;
  }
  export function ref(db: Database, path?: string): DatabaseReference;
  export function get(query: DatabaseReference): Promise<DataSnapshot>;
  export function update(ref: DatabaseReference, values: object): Promise<void>;
}
