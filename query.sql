drop table if exists users

create table users(
    id serial primary key,
    email varchar(100) not null,
    password varchar(100) not null
);