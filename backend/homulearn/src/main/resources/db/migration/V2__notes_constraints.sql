-- V2: enforce NOT NULL + non-blank on notes.title
alter table notes alter column title set not null;
alter table notes add constraint notes_title_nonempty check (trim(title) <> '');
