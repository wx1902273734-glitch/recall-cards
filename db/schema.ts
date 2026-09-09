import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

export const cardStore = sqliteTable('card_store', {
  id: integer('id').primaryKey(),
  revision: integer('revision').notNull(),
  cards: text('cards').notNull(),
});
