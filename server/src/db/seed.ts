import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { db } from './index';
import { topics } from './schema';

interface SeedTopic {
  title: string;
  scenario: string;
  tags: string[];
}

const TOPICS_PATH = join(import.meta.dir, 'seed', 'topics.json');

function seedTopics(): void {
  const count = db.select({ id: topics.id }).from(topics).all().length;
  if (count > 0) {
    console.log(`Topics already seeded (${count} existing), skipping`);
    return;
  }

  const raw = readFileSync(TOPICS_PATH, 'utf-8');
  const seedData: SeedTopic[] = JSON.parse(raw);

  for (let i = 0; i < seedData.length; i++) {
    const t = seedData[i];
    db.insert(topics).values({
      id: i + 1,
      title: t.title,
      scenario: t.scenario,
      tags: t.tags,
    }).run();
  }

  console.log(`Seeded ${seedData.length} topics`);
}

seedTopics();
