#!/bin/bash

# Corrigir mensagens de commit da branch frontend
git filter-branch --msg-filter '
case "$GIT_COMMIT" in
    "71a059d"*) 
        echo "fix: add missing Angular compiler dependency

Added @angular/compiler to resolve module import errors
Angular dev server now starting properly"
        ;;
    "f035d4f"*) 
        echo "fix: update angular.json configuration

Add build configurations for production and development
Fix schema validation errors for Angular 18"
        ;;
    "3dbe5b7"*) 
        echo "fix: align zone.js version

Update zone.js to match Angular core requirements
Resolve peer dependency conflicts"
        ;;
    "0195c72"*) 
        echo "fix: resolve Angular version conflicts

Update all Angular packages to compatible versions
Add required build dependencies"
        ;;
    "9686876"*) 
        echo "feat: setup Angular enterprise foundation

Create basic Angular workspace structure
Configure TypeScript and build system
Add routing and component architecture"
        ;;
    *) 
        cat
        ;;
esac
' HEAD~5..HEAD