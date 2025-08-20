const db = require('../../config/database');

class SlideModel {
    static async findAllByLocationSlugGrouped(locationSlug) {
        const [locations] = await db.execute('SELECT id FROM locations WHERE slug = ?', [locationSlug]);
        if (locations.length === 0) return {};
        const locationId = locations[0].id;

        const [slides] = await db.execute(
            'SELECT * FROM slides WHERE location_id = ? AND is_active = TRUE ORDER BY day_of_week, display_order ASC',
            [locationId]
        );

        const groupedSlides = slides.reduce((acc, slide) => {
            const day = slide.day_of_week;
            if (!acc[day]) {
                acc[day] = [];
            }
            acc[day].push(slide);
            return acc;
        }, {});

        return groupedSlides;
    }

    static async findByLocationAndDay(locationSlug, dayOfWeek) {
        const [locations] = await db.execute('SELECT id FROM locations WHERE slug = ?', [locationSlug]);
        if (locations.length === 0) return [];
        const locationId = locations[0].id;

        const [slides] = await db.execute(
            'SELECT * FROM slides WHERE location_id = ? AND day_of_week = ? AND is_active = TRUE ORDER BY display_order ASC',
            [locationId, dayOfWeek]
        );
        return slides;
    }

    static async create(locationId, imageFilename, dayOfWeek) {
        const [
            [{
                max_order
            }]
        ] = await db.execute(
            'SELECT COALESCE(MAX(display_order), 0) as max_order FROM slides WHERE location_id = ? AND day_of_week = ?',
            [locationId, dayOfWeek]
        );
        const newOrder = max_order + 1;

        const [result] = await db.execute(
            'INSERT INTO slides (location_id, day_of_week, image_filename, display_order) VALUES (?, ?, ?, ?)',
            [locationId, dayOfWeek, imageFilename, newOrder]
        );
        return {
            id: result.insertId,
            image_filename: imageFilename,
            day_of_week: dayOfWeek
        };
    }

    static async remove(slideId) {
        const [result] = await db.execute('DELETE FROM slides WHERE id = ?', [slideId]);
        return result.affectedRows > 0;
    }

    static async findById(slideId) {
        const [slides] = await db.execute(`
            SELECT s.*, l.slug as location_slug
            FROM slides s
            JOIN locations l ON s.location_id = l.id
            WHERE s.id = ?
        `, [slideId]);
        return slides[0];
    }
}

module.exports = SlideModel;