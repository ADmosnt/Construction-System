// src/main/database.ts

import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';

let db: Database.Database | null = null;

/**
 * Inicializa la base de datos SQLite
 */
export function initDatabase(): Database.Database {
  if (db) return db;

  // Ruta donde se guardará la base de datos
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'construccion.db');

  console.log('📁 Database path:', dbPath);

  // Verificar si la base de datos ya existe
  const dbExists = fs.existsSync(dbPath);

  // Crear/abrir la base de datos
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL'); // Mejor rendimiento

  // Si es la primera vez, crear el esquema y poblar datos
  if (!dbExists) {
    console.log('🔨 Creating database schema...');
    createSchema();
    console.log('🌱 Seeding initial data...');
    seedData();
    console.log('✅ Database initialized successfully!');
  } else {
    console.log('✅ Database already exists, connected successfully!');
  }

  return db;
}

/**
 * Obtiene la instancia de la base de datos
 */
export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

/**
 * Crea el esquema de la base de datos
 */
function createSchema(): void {
  const schemaPath = path.join(__dirname, '../../database/schema.sql');
  
  if (!fs.existsSync(schemaPath)) {
    console.error('❌ Schema file not found:', schemaPath);
    return;
  }

  const schema = fs.readFileSync(schemaPath, 'utf-8');
  
  // Ejecutar el esquema
  db!.exec(schema);
}

/**
 * Pobla la base de datos con datos iniciales
 */
function seedData(): void {
  const seedPath = path.join(__dirname, '../../database/seed.sql');
  
  if (!fs.existsSync(seedPath)) {
    console.error('❌ Seed file not found:', seedPath);
    return;
  }

  const seed = fs.readFileSync(seedPath, 'utf-8');
  
  // Ejecutar los datos iniciales
  db!.exec(seed);
}

/**
 * Cierra la conexión a la base de datos
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    console.log('🔒 Database connection closed');
  }
}

// Funciones helper para queries comunes
export const dbHelpers = {
  /**
   * Ejecuta una query SELECT y devuelve todos los resultados
   */
  all: <T = any>(query: string, params: any[] = []): T[] => {
    return getDatabase().prepare(query).all(...params) as T[];
  },

  /**
   * Ejecuta una query SELECT y devuelve un solo resultado
   */
  get: <T = any>(query: string, params: any[] = []): T | undefined => {
    return getDatabase().prepare(query).get(...params) as T | undefined;
  },

  /**
   * Ejecuta una query INSERT/UPDATE/DELETE
   */
  run: (query: string, params: any[] = []): Database.RunResult => {
    return getDatabase().prepare(query).run(...params);
  },

  /**
   * Ejecuta una transacción
   */
  transaction: <T>(fn: () => T): T => {
    const transaction = getDatabase().transaction(fn);
    return transaction();
  }
};