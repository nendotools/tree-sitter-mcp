#ifndef USER_H
#define USER_H

#include <stdbool.h>

typedef struct {
    long id;
    char name[100];
    char email[100];
    bool active;
} User;

typedef struct UserNode {
    User user;
    struct UserNode* next;
} UserNode;

typedef struct {
    UserNode* head;
    int count;
} UserRepository;

User create_user(const char* name, const char* email);
char* get_display_name(const User* user);
long generate_id(void);

UserRepository* create_repository(void);
void destroy_repository(UserRepository* repo);
User* save_user(UserRepository* repo, const User* user);
User* find_user_by_id(const UserRepository* repo, long id);
User* find_user_by_email(const UserRepository* repo, const char* email);
bool delete_user_by_id(UserRepository* repo, long id);
int get_user_count(const UserRepository* repo);

#endif