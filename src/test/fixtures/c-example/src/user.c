#include "user.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

User create_user(const char* name, const char* email) {
    User user;
    user.id = generate_id();
    strncpy(user.name, name, sizeof(user.name) - 1);
    user.name[sizeof(user.name) - 1] = '\0';
    strncpy(user.email, email, sizeof(user.email) - 1);
    user.email[sizeof(user.email) - 1] = '\0';
    user.active = true;
    return user;
}

char* get_display_name(const User* user) {
    static char display_name[120];
    if (user->active) {
        strcpy(display_name, user->name);
    } else {
        snprintf(display_name, sizeof(display_name), "%s (inactive)", user->name);
    }
    return display_name;
}

long generate_id(void) {
    return (long)time(NULL) * 1000;
}

UserRepository* create_repository(void) {
    UserRepository* repo = malloc(sizeof(UserRepository));
    if (repo) {
        repo->head = NULL;
        repo->count = 0;
    }
    return repo;
}

void destroy_repository(UserRepository* repo) {
    if (!repo) return;
    
    UserNode* current = repo->head;
    while (current) {
        UserNode* next = current->next;
        free(current);
        current = next;
    }
    free(repo);
}

User* save_user(UserRepository* repo, const User* user) {
    if (!repo || !user) return NULL;
    
    UserNode* new_node = malloc(sizeof(UserNode));
    if (!new_node) return NULL;
    
    new_node->user = *user;
    new_node->next = repo->head;
    repo->head = new_node;
    repo->count++;
    
    return &new_node->user;
}

User* find_user_by_id(const UserRepository* repo, long id) {
    if (!repo) return NULL;
    
    UserNode* current = repo->head;
    while (current) {
        if (current->user.id == id) {
            return &current->user;
        }
        current = current->next;
    }
    return NULL;
}

User* find_user_by_email(const UserRepository* repo, const char* email) {
    if (!repo || !email) return NULL;
    
    UserNode* current = repo->head;
    while (current) {
        if (strcmp(current->user.email, email) == 0) {
            return &current->user;
        }
        current = current->next;
    }
    return NULL;
}

bool delete_user_by_id(UserRepository* repo, long id) {
    if (!repo) return false;
    
    UserNode* current = repo->head;
    UserNode* prev = NULL;
    
    while (current) {
        if (current->user.id == id) {
            if (prev) {
                prev->next = current->next;
            } else {
                repo->head = current->next;
            }
            free(current);
            repo->count--;
            return true;
        }
        prev = current;
        current = current->next;
    }
    return false;
}

int get_user_count(const UserRepository* repo) {
    return repo ? repo->count : 0;
}