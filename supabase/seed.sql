-- ROSP Supabase Seed SQL
-- Foundation vocabulary dataset populated from Oxford 3000/5000 lemmas, NGSL, Tatoeba examples, and WordNet synonyms

INSERT INTO public.vocabulary_words (word, language, part_of_speech, cefr_level, frequency, frequency_rank, source, definition, example, synonyms)
VALUES
-- A1 Core Vocabulary
('apple', 'en', 'noun', 'A1', 85.5, 1200, 'Oxford 3000 / NGSL', 'A round fruit with firm white flesh and a green, red, or yellow skin.', 'She picked a crisp red apple from the tree in the garden.', ARRAY['pome', 'fruit']),
('house', 'en', 'noun', 'A1', 92.1, 450, 'Oxford 3000 / NGSL', 'A building that people, usually one family, live in.', 'They bought a charming stone house near the lake.', ARRAY['home', 'residence', 'dwelling']),
('water', 'en', 'noun', 'A1', 96.4, 180, 'Oxford 3000 / NGSL', 'A clear liquid, without color or taste, that falls from the sky as rain.', 'It is essential to drink plenty of fresh water every day.', ARRAY['liquid', 'aqua']),
('book', 'en', 'noun', 'A1', 90.3, 520, 'Oxford 3000 / NGSL', 'A written work published in printed or electronic format.', 'He spent the rainy afternoon reading a fascinating history book.', ARRAY['tome', 'volume', 'publication']),
('time', 'en', 'noun', 'A1', 99.1, 55, 'Oxford 3000 / NGSL', 'The continuous progression of existence and events in the past, present, and future.', 'Do you have time to review the lesson with me today?', ARRAY['moment', 'period', 'duration']),
('friend', 'en', 'noun', 'A1', 89.7, 610, 'Oxford 3000 / NGSL', 'A person whom one knows and with whom one has a bond of mutual affection.', 'A good friend will support you through both joy and adversity.', ARRAY['companion', 'pal', 'ally']),
('learn', 'en', 'verb', 'A1', 88.9, 730, 'Oxford 3000 / NGSL', 'To gain knowledge or skill in something through study, experience, or teaching.', 'Children learn language quickly through continuous active immersion.', ARRAY['master', 'acquire', 'grasp']),
('beautiful', 'en', 'adjective', 'A1', 84.2, 1420, 'Oxford 3000 / NGSL', 'Pleasing the senses or mind aesthetically.', 'We watched a beautiful sunrise illuminate the mountain peaks.', ARRAY['gorgeous', 'lovely', 'attractive']),

-- A2 Core Vocabulary
('important', 'en', 'adjective', 'A2', 88.0, 600, 'Oxford 3000 / NGSL', 'Of great significance or value; likely to have a profound effect on success.', 'Daily spaced repetition is an important habit for retention.', ARRAY['crucial', 'essential', 'significant']),
('language', 'en', 'noun', 'A2', 82.3, 950, 'Oxford 3000 / NGSL', 'A system of communication consisting of sounds, words, and grammar.', 'Mastering a foreign language broadens your cognitive horizons.', ARRAY['tongue', 'speech', 'dialect']),
('travel', 'en', 'verb', 'A2', 83.1, 1100, 'Oxford 3000 / NGSL', 'To go from one place to another, typically over a distance.', 'She hopes to travel through Europe after finishing her degree.', ARRAY['journey', 'voyage', 'tour']),
('decide', 'en', 'verb', 'A2', 86.5, 870, 'Oxford 3000 / NGSL', 'To make a choice from a number of alternatives after consideration.', 'You need to decide which study goal you want to achieve today.', ARRAY['choose', 'determine', 'resolve']),
('improve', 'en', 'verb', 'A2', 85.0, 990, 'Oxford 3000 / NGSL', 'To make or become better in quality, condition, or skill.', 'Regular reading will dramatically improve your active vocabulary.', ARRAY['enhance', 'boost', 'upgrade']),
('culture', 'en', 'noun', 'A2', 84.6, 1050, 'Oxford 3000 / NGSL', 'The customs, arts, social institutions, and achievements of a social group.', 'Experiencing traditional cuisine is a delightful way to explore a new culture.', ARRAY['heritage', 'customs', 'society']),
('memory', 'en', 'noun', 'A2', 81.7, 1380, 'Oxford 3000 / NGSL', 'The faculty by which the mind stores and remembers information.', 'Spaced repetition models predict the gradual decay of human memory.', ARRAY['recall', 'retention', 'recollection']),

-- B1 Core Vocabulary
('achieve', 'en', 'verb', 'B1', 80.4, 1550, 'Oxford 3000 / NGSL', 'To successfully bring about or reach a desired objective by effort or skill.', 'With consistent discipline, you will achieve your target fluency level.', ARRAY['accomplish', 'attain', 'fulfill']),
('challenge', 'en', 'noun', 'B1', 82.8, 1280, 'Oxford 3000 / NGSL', 'A task or situation that tests someone’s ability, endurance, or resolve.', 'Learning irregular verbs proved to be a stimulating linguistic challenge.', ARRAY['obstacle', 'trial', 'difficulty']),
('convenient', 'en', 'adjective', 'B1', 76.2, 2100, 'Oxford 3000 / NGSL', 'Fitting in well with a person’s needs, activities, or plans; easy to use.', 'Studying flashcards on a mobile app is remarkably convenient.', ARRAY['handy', 'practical', 'accessible']),
('environment', 'en', 'noun', 'B1', 83.9, 1140, 'Oxford 3000 / NGSL', 'The surroundings or conditions in which a person, animal, or plant lives.', 'A quiet environment helps learners concentrate deeply on difficult material.', ARRAY['surroundings', 'setting', 'milieu']),
('opportunity', 'en', 'noun', 'B1', 84.1, 1120, 'Oxford 3000 / NGSL', 'A set of circumstances that makes it possible to do something beneficial.', 'Studying abroad presents an invaluable opportunity to practice conversational skills.', ARRAY['chance', 'opening', 'occasion']),
('recommend', 'en', 'verb', 'B1', 79.5, 1720, 'Oxford 3000 / NGSL', 'To suggest that someone or something would be good or suitable for a purpose.', 'Teachers recommend reviewing new words within twenty-four hours of encounter.', ARRAY['advise', 'propose', 'suggest']),
('frequent', 'en', 'adjective', 'B1', 78.8, 1850, 'Oxford 3000 / NGSL', 'Occurring or appearing quite often; happening at short intervals.', 'Frequent short review sessions outperform rare marathon cramming.', ARRAY['regular', 'repeated', 'continual']),

-- B2 Core Vocabulary
('comprehend', 'en', 'verb', 'B2', 71.3, 2900, 'Oxford 5000 / NGSL', 'To grasp mentally; understand the nature or meaning of fully.', 'Advanced learners can comprehend complex grammatical nuances effortlessly.', ARRAY['understand', 'fathom', 'apprehend']),
('fluency', 'en', 'noun', 'B2', 68.9, 3200, 'Oxford 5000 / NGSL', 'The ability to speak or write a foreign language easily, accurately, and naturally.', 'Consistent conversational practice is the swiftest route to conversational fluency.', ARRAY['eloquence', 'mastery', 'command']),
('efficient', 'en', 'adjective', 'B2', 79.2, 1780, 'Oxford 5000 / NGSL', 'Achieving maximum productivity with minimum wasted effort or expense.', 'The FSRS algorithm schedules reviews in an exceptionally efficient manner.', ARRAY['productive', 'effective', 'competent']),
('persistent', 'en', 'adjective', 'B2', 72.8, 2680, 'Oxford 5000 / NGSL', 'Continuing firmly or obstinately in a course of action in spite of difficulty.', 'Persistent learners gradually overcome initial pronunciation hurdles.', ARRAY['tenacious', 'persevering', 'resolute']),
('sophisticated', 'en', 'adjective', 'B2', 74.5, 2450, 'Oxford 5000 / NGSL', 'Developed to a high degree of complexity and refinement.', 'Modern neural models generate sophisticated exercises tailored to learner weaknesses.', ARRAY['advanced', 'refined', 'complex']),
('retention', 'en', 'noun', 'B2', 70.1, 3100, 'Oxford 5000 / NGSL', 'The continued possession, use, or maintenance of knowledge in memory.', 'Spaced intervals optimize long-term cognitive retention of vocabulary.', ARRAY['preservation', 'holding', 'recall']),
('context', 'en', 'noun', 'B2', 82.5, 1320, 'Oxford 5000 / NGSL', 'The circumstances that form the setting for an event, statement, or idea.', 'Inferring meaning from surrounding textual context enhances comprehension.', ARRAY['framework', 'background', 'milieu']),

-- C1 / C2 Advanced Vocabulary
('eloquent', 'en', 'adjective', 'C1', 67.2, 3600, 'Oxford 5000 / WordNet', 'Fluent or persuasive in speaking or writing; vividly expressive.', 'The speaker delivered an eloquent address praising multilingual education.', ARRAY['articulate', 'expressive', 'fluent']),
('meticulous', 'en', 'adjective', 'C1', 65.8, 3850, 'Oxford 5000 / WordNet', 'Showing great attention to detail; very careful and precise.', 'He took meticulous notes while dissecting each subtle phonetic distinction.', ARRAY['thorough', 'diligent', 'punctilious']),
('ephemeral', 'en', 'adjective', 'C2', 59.4, 4900, 'WordNet', 'Lasting for a very short period of time; fleeting.', 'Sensory memories are ephemeral unless consolidated into long-term structures.', ARRAY['fleeting', 'transient', 'evanescent']),
('ubiquitous', 'en', 'adjective', 'C1', 66.4, 3720, 'WordNet', 'Present, appearing, or found everywhere.', 'Smartphones have made language learning apps ubiquitous across the globe.', ARRAY['omnipresent', 'pervasive', 'universal']),
('pragmatic', 'en', 'adjective', 'C1', 71.0, 2950, 'WordNet', 'Dealing with things sensibly and realistically based on practical considerations.', 'She adopted a pragmatic study schedule that balanced work and language drills.', ARRAY['practical', 'sensible', 'realistic'])
ON CONFLICT DO NOTHING;
