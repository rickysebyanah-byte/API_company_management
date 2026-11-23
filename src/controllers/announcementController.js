const { run, get, all } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/responseHelper');

const getAllAnnouncements = async (req, res, next) => {
  try {
    const announcements = await all(
      `SELECT a.*, u.username AS author_username
       FROM announcements a
       JOIN users u ON a.author_id = u.id
       ORDER BY a.created_at DESC`
    );
    return successResponse(res, 200, 'Daftar pengumuman perusahaan berhasil diambil', announcements);
  } catch (error) {
    next(error);
  }
};

const getAnnouncementById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const announcement = await get(
      `SELECT a.*, u.username AS author_username
       FROM announcements a
       JOIN users u ON a.author_id = u.id
       WHERE a.id = ?`,
      [id]
    );

    if (!announcement) return errorResponse(res, 404, 'Pengumuman tidak ditemukan');
    return successResponse(res, 200, 'Detail pengumuman berhasil diambil', announcement);
  } catch (error) {
    next(error);
  }
};

const createAnnouncement = async (req, res, next) => {
  try {
    const { title, content, priority = 'Normal', category = 'Umum' } = req.body;

    const result = await run(
      `INSERT INTO announcements (title, content, priority, category, author_id)
       VALUES (?, ?, ?, ?, ?)`,
      [title, content, priority, category, req.user.id]
    );

    const announcement = await get('SELECT * FROM announcements WHERE id = ?', [result.id]);
    return successResponse(res, 201, 'Pengumuman berhasil diterbitkan', announcement);
  } catch (error) {
    next(error);
  }
};

const updateAnnouncement = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, content, priority, category } = req.body;

    const existing = await get('SELECT * FROM announcements WHERE id = ?', [id]);
    if (!existing) return errorResponse(res, 404, 'Pengumuman tidak ditemukan');

    await run(
      `UPDATE announcements
       SET title = ?, content = ?, priority = ?, category = ?
       WHERE id = ?`,
      [
        title !== undefined ? title : existing.title,
        content !== undefined ? content : existing.content,
        priority !== undefined ? priority : existing.priority,
        category !== undefined ? category : existing.category,
        id
      ]
    );

    const updated = await get('SELECT * FROM announcements WHERE id = ?', [id]);
    return successResponse(res, 200, 'Pengumuman berhasil diperbarui', updated);
  } catch (error) {
    next(error);
  }
};

const deleteAnnouncement = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await get('SELECT id FROM announcements WHERE id = ?', [id]);
    if (!existing) return errorResponse(res, 404, 'Pengumuman tidak ditemukan');

    await run('DELETE FROM announcements WHERE id = ?', [id]);
    return successResponse(res, 200, 'Pengumuman berhasil dihapus');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllAnnouncements,
  getAnnouncementById,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement
};
