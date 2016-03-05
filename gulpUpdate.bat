@echo off
call npm config set registry http://registry.npmjs.org/
@echo on
call npm i --save-dev
@echo off
PAUSE
