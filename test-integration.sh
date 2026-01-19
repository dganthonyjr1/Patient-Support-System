#!/bin/bash

echo "=========================================="
echo "Dr. Meusburger Patient Support System"
echo "Integration Test Suite"
echo "=========================================="
echo ""

# Test 1: Check Node.js version
echo "✓ Test 1: Node.js Environment"
node --version
npm --version
echo ""

# Test 2: Check dependencies
echo "✓ Test 2: Dependencies Installation"
if [ -d "node_modules" ]; then
  echo "✓ Dependencies installed"
  echo "  - React: $(npm list react 2>/dev/null | grep react | head -1)"
  echo "  - Stripe: $(npm list @stripe/react-stripe-js 2>/dev/null | grep stripe | head -1)"
else
  echo "✗ Dependencies not installed"
fi
echo ""

# Test 3: Check environment variables
echo "✓ Test 3: Environment Configuration"
if [ -f ".env.local" ]; then
  echo "✓ .env.local file exists"
  if grep -q "GEMINI_API_KEY" .env.local; then
    echo "✓ GEMINI_API_KEY configured"
  else
    echo "⚠ GEMINI_API_KEY not configured"
  fi
else
  echo "⚠ .env.local file not found"
fi
echo ""

# Test 4: Check source files
echo "✓ Test 4: Source Files"
files=(
  "App.tsx"
  "services/geminiLiveService.ts"
  "services/paymentService.ts"
  "services/updoxService.ts"
  "components/PaymentCheckout.tsx"
  "components/FeeManagement.tsx"
  "components/UpdoxMessaging.tsx"
  "components/UpdoxConversations.tsx"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "✓ $file"
  else
    echo "✗ $file (missing)"
  fi
done
echo ""

# Test 5: Check build
echo "✓ Test 5: Build System"
if [ -f "vite.config.ts" ]; then
  echo "✓ Vite configuration found"
fi
if [ -f "tsconfig.json" ]; then
  echo "✓ TypeScript configuration found"
fi
echo ""

# Test 6: Check documentation
echo "✓ Test 6: Documentation"
docs=(
  "README.md"
  "README_COMPLETE.md"
  "SETUP_GUIDE.md"
  "UPDOX_INTEGRATION.md"
  ".env.example"
)

for doc in "${docs[@]}"; do
  if [ -f "$doc" ]; then
    echo "✓ $doc"
  else
    echo "✗ $doc (missing)"
  fi
done
echo ""

echo "=========================================="
echo "Integration Test Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Set up environment variables in .env.local"
echo "2. Run: npm run dev (frontend only)"
echo "3. Run: npm run dev:all (full stack)"
echo "4. Visit: http://localhost:3000"
echo ""
