# Proyek ElysiaJS

Template ini dibuat menggunakan [create-elysiajs](https://github.com/kravetsone/create-elysiajs).

## Teknologi yang Digunakan

- **Framework Backend** : [ElysiaJS](https://elysiajs.com/)
- **Database & ORM** : [Prisma](https://www.prisma.io/) + [PostgreSQL](https://www.postgresql.org/)
- **Linter** : [ESLint](https://eslint.org/)
- **Plugins Elysia** :
- [CORS](https://elysiajs.com/plugins/cors.html) - Mengelola kebijakan akses lintas domain
- [Swagger](https://elysiajs.com/plugins/swagger.html) - Dokumentasi API interaktif
- [JWT](https://elysiajs.com/plugins/jwt.html) - Autentikasi berbasis JSON Web Token
- [Logger](https://github.com/bogeychan/elysia-logger) - Logging request dan response

## Cara Menjalankan Proyek

1. **Clone repositori**git clone https://github.com/TestAkun01/Cloud-Storage-Backend
2. **Instal dependensi**

   ```bash
   bun install
   ```
3. **Konfigurasi Database**

   - Pastikan PostgreSQL sudah berjalan
   - Atur `.env` dengan koneksi database
   - Jalankan migrasi

     ```bash
     bun migrate
     ```
4. **Menjalankan Server**

   ```bash
   bun dev
   ```

Server akan berjalan di `http://localhost:3000` secara default.

## Dokumentasi API

Swagger dapat diakses di `http://localhost:3000/swagger` setelah server berjalan.

### Available Endpoints

### **Autentikasi**

- [X] `POST /auth/register` → Register user baru
- [X] `POST /auth/login` → Login dan mendapatkan access token + refresh token
- [X] `POST /auth/refresh` → Mendapatkan access token baru dari refresh token
- [X] `POST /auth/logout` → Logout dan revoke refresh token

### **User**

- [ ] `GET /users/me` → Mendapatkan detail user yang sedang login
- [ ] `GET /users/storage` → Melihat kuota penyimpanan yang terpakai

### **File Management**

- [X] `POST /files/upload` → Upload file baru
- [X] `GET /files` → List semua file user
- [X] `GET /files/:id` → Mendapatkan detail file
- [X] `GET /files/:id/download` → Download file (to do: menambahkan link download asli)
- [X] `PUT /files/:id` → Update metadata file (misal rename) (to do: menambahkan ekstensi di nama yang baru)
- [X] `DELETE /files/:id` → Hapus file (ke trash)
- [X] `GET /files/:id/versions` → Melihat versi file sebelumnya
- [X] `POST /files/:id/restore` → Mengembalikan file dari trash

### File Versioning Management

- [X] `GET /file-versions/:id `→ Melihat semua versi file
- [X] `POST /files-versions/:id `→ Menambahkan versi baru
- [X] `GET /file-versions/:id/:versionId/restore `→ Mengembalikan file ke versi tertentu

### **Folder Management**

- [X] `POST /folders` → Membuat folder baru
- [X] `GET /folders` → List folder user
- [X] `GET /folders/:id` → Melihat isi folder
- [X] `PUT /folders/:id` → Rename folder
- [X] `DELETE /folders/:id` → Hapus folder (ke trash)
- [X] `POST /files/:id/restore` → Mengembalikan folder dari trash

### **Sharing**

- [ ] `POST /share` → Membagikan file/folder ke user lain
- [ ] `GET /share` → List file/folder yang dibagikan
- [ ] `DELETE /share/:id` → Menghapus akses berbagi

### **Trash (Recycle Bin)**

- [ ] `GET /trash` → Melihat file/folder yang dihapus
- [ ] `POST /trash/restore/:id` → Mengembalikan file/folder dari trash
- [ ] `DELETE /trash/:id` → Hapus permanen file/folder

### **Tag & Metadata**

- [ ] `POST /tags` → Menambahkan tag ke file
- [ ] `GET /tags` → List semua tag
- [ ] `DELETE /tags/:id` → Menghapus tag

### **Webhook**

- [ ] `POST /webhooks` → Menambahkan webhook baru
- [ ] `GET /webhooks` → List semua webhook
- [ ] `DELETE /webhooks/:id` → Menghapus webhook
