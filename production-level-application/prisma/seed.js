import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

// --- FIX ESM MODULES UNTUK __dirname ---
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// ------------------------------------------

const prisma = new PrismaClient();

// Urutan yang benar untuk PENGHAPUSAN (dependent harus dihapus lebih dulu)
const DELETION_ORDER = [
  "taskAssignment.json",
  "comment.json",
  "attachment.json",
  "task.json",
  "projectTeam.json",
  "project.json",
  "user.json",
  "team.json",
];

// Urutan yang benar untuk CREATION (core tables harus dibuat lebih dulu)
const CREATION_ORDER = [
  "team.json",
  "project.json",
  "user.json", 
  "projectTeam.json",
  "task.json",
  "attachment.json",
  "comment.json",
  "taskAssignment.json",
];


async function deleteAllData(orderedFileNames) {
  // Hanya ambil nama model yang akan dihapus
  const modelNames = orderedFileNames.map((fileName) => {
    const modelName = path.basename(fileName, path.extname(fileName));
    return modelName.charAt(0).toUpperCase() + modelName.slice(1);
  });

  for (const modelName of modelNames) {
    const model = prisma[modelName];
    try {
      // Menggunakan TRUNCATE dengan CASCADE untuk reset ID Integer dan relasi
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${modelName}" RESTART IDENTITY CASCADE;`);
      console.log(`Cleared and reset ${modelName}`);
    } catch (error) {
      console.error(`Error clearing data from ${modelName}:`, error);
    }
  }
}

async function main() {
  const dataDirectory = path.join(__dirname, "seedData");

  // Hapus data dengan urutan yang benar (DELETION_ORDER)
  await deleteAllData(DELETION_ORDER);

  // Isi data dengan urutan yang benar (CREATION_ORDER)
  for (const fileName of CREATION_ORDER) {
    const filePath = path.join(dataDirectory, fileName);
    const jsonData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const modelName = path.basename(fileName, path.extname(fileName));
    const model = prisma[modelName];

    try {
      for (const data of jsonData) {
        
        // --- PATCH UNTUK MODEL USER ---
        if (modelName === 'user') {
            // Tambahkan field wajib
            data.clerkId = data.cognitoId; 
            data.firstName = data.username.split(/(?=[A-Z])/)[0] || 'Seed';
            data.secondName = data.username.split(/(?=[A-Z])/)[1] || 'User';
            
            // Transform teamId (FK) ke sintaks relasi yang disukai Prisma
            if (data.teamId) {
                data.Team = { connect: { id: data.teamId } };
            }

            // Hapus field yang tidak dikenali/tidak diperlukan oleh Prisma setelah transformasi
            delete data.username;
            delete data.teamId;
            delete data.cognitoId;
        }
        // --- AKHIR PATCH ---

        await model.create({ data });
      }
      console.log(`Seeded ${modelName} with data from ${fileName}`);
    } catch (error) {
      console.error(`Error seeding data for ${modelName}:`, error);
    }
  }
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());