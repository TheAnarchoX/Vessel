import items from "../content/items.json";
import enemies from "../content/enemies.json";
import rooms from "../content/rooms.json";

type ItemCategory = "offense" | "defense" | "utility" | "economy" | "corruption_tech";
type Behavior = "chase" | "charge" | "kite" | "summon" | "zone";
type Role = "melee" | "ranged" | "area";
type RoomType = "start" | "boss" | "combat" | "altar" | "confession" | "reliquary" | "rest";

interface ItemDef {
  id: string;
  name: string;
  category: ItemCategory;
  corruption: number;
  tags: string[];
  effects: Record<string, number | boolean>;
}

interface EnemyArchetype {
  id: string;
  behavior: Behavior;
  role: Role;
  baseHealth: number;
  baseSpeed: number;
  telegraphMs: number;
  readMs: number;
  recoverMs: number;
}

interface RoomTemplate {
  id: string;
  type: RoomType;
  intensity: number;
  allowsCombatLock: boolean;
  notes?: string;
}

function asItemDefs(value: unknown): ItemDef[] {
  if (!Array.isArray(value)) throw new Error("items.json must be an array");
  return value as ItemDef[];
}

function asEnemyArchetypes(value: unknown): EnemyArchetype[] {
  if (!Array.isArray(value)) throw new Error("enemies.json must be an array");
  return value as EnemyArchetype[];
}

function asRoomTemplates(value: unknown): RoomTemplate[] {
  if (!Array.isArray(value)) throw new Error("rooms.json must be an array");
  return value as RoomTemplate[];
}

const typedItems = asItemDefs(items);
const typedEnemies = asEnemyArchetypes(enemies);
const typedRooms = asRoomTemplates(rooms);

export const __phase7TypeContract = {
  itemCount: typedItems.length,
  enemyCount: typedEnemies.length,
  roomCount: typedRooms.length,
};
