drop table if exists users

create table users(
    id serial primary key,
    email varchar(100) not null,
    password varchar(100) not null
);

const createUsersTable = `
    CREATE TABLE IF NOT EXISTS joke_users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        password varchar(100) NOT NULL
    );
`;
