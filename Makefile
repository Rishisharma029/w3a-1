# ==============================================================================
# W3A-1: Autonomous Machine Payments (x402 V2) - Makefile
# ==============================================================================

.PHONY: env start test test-all demo install clean

env:
	node scripts/make-env.js

start:
	npm run start

test:
	npm test

test-all:
	npm run test:all

demo:
	npm run demo:x402

install:
	npm install
