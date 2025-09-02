const db = require('../../config/database');

class WebRatingModel {
    static async findByLocation(locationSlug) {
        const [rows] = await db.execute('SELECT * FROM google_reviews WHERE location_slug = ? ORDER BY rating DESC, fetched_at DESC', [locationSlug]);
        return rows;
    }

    static async clearReviewsByLocation(locationSlug) {
        await db.execute('DELETE FROM google_reviews WHERE location_slug = ?', [locationSlug]);
    }

    static async saveReview(reviewData) {
        const { location_slug, author, date, text, profile_photo_url, rating } = reviewData;
        const sql = 'INSERT INTO google_reviews (location_slug, author, date, text, profile_photo_url, rating) VALUES (?, ?, ?, ?, ?, ?)';
        await db.execute(sql, [location_slug, author, date, text, profile_photo_url, rating]);
    }
}

module.exports = WebRatingModel;