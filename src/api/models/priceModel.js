const db = require('../../config/database');

class PriceModel {
    static async findAllByLocationSlug(locationSlug) {
        const [locations] = await db.execute('SELECT id FROM locations WHERE slug = ?', [locationSlug]);
        if (locations.length === 0) {
            return null;
        }
        const locationId = locations[0].id;

        const [prices] = await db.execute('SELECT * FROM prices WHERE location_id = ?', [locationId]);
        const [messages] = await db.execute('SELECT * FROM service_messages WHERE location_id = ?', [locationId]);
        const [holidays] = await db.execute('SELECT * FROM holidays WHERE location_id = ?', [locationId]);

        return {
            prices,
            messages,
            holidays
        };
    }

    static async updateAllByLocationSlug(locationSlug, data) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const [locations] = await connection.execute('SELECT id FROM locations WHERE slug = ?', [locationSlug]);
            if (locations.length === 0) {
                throw new Error('Localização não encontrada.');
            }
            const locationId = locations[0].id;

            await connection.execute('DELETE FROM holidays WHERE location_id = ?', [locationId]);

            for (const day_type in data.dias) {
                const dayData = data.dias[day_type];

                if (dayData.prices) {
                    for (const service_type in dayData.prices) {
                        const servicePrices = dayData.prices[service_type];
                        for (const time_slot in servicePrices) {
                            const price = servicePrices[time_slot];
                            const priceSql = `
                                INSERT INTO prices (location_id, day_type, service_type, time_slot, price)
                                VALUES (?, ?, ?, ?, ?)
                                ON DUPLICATE KEY UPDATE price = VALUES(price)
                            `;
                            await connection.execute(priceSql, [locationId, day_type, service_type, time_slot, price]);
                        }
                    }
                }

                if (dayData.messages) {
                    for (const service_type in dayData.messages) {
                        const messageData = dayData.messages[service_type];
                        if (messageData && typeof messageData.message !== 'undefined') {
                            const messageSql = `
                                INSERT INTO service_messages (location_id, day_type, service_type, message)
                                VALUES (?, ?, ?, ?)
                                ON DUPLICATE KEY UPDATE message = VALUES(message)
                            `;
                            await connection.execute(messageSql, [locationId, day_type, service_type, messageData.message]);
                        }
                    }
                }
            }

            if (data.feriados && data.feriados.length > 0) {
                const holidayValues = data.feriados.map(dateStr => {
                    const [day, month, year] = dateStr.split('-');
                    return [locationId, `${year}-${month}-${day}`];
                });
                await connection.query('INSERT INTO holidays (location_id, holiday_date) VALUES ?', [holidayValues]);
            }

            await connection.commit();
        } catch (error) {
            await connection.rollback();
            console.error("[priceModel.js] Erro na transação:", error);
            throw error;
        } finally {
            connection.release();
        }
    }

    static async cleanupPastHolidays() {
        const today = new Date().toISOString().split('T')[0];
        const [result] = await db.execute('DELETE FROM holidays WHERE holiday_date < ?', [today]);
        return result.affectedRows;
    }
}

module.exports = PriceModel;