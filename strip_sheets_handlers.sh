#!/bin/bash
awk '
/const handleSaveToGoogleSheets = async \(\) => {/ { skip = 1 }
/const handleLoadFromGoogleSheets = async \(\) => {/ { skip = 1 }
/^\s*};\s*$/ && skip {
    skip = 0
    next
}
!skip { print }
' src/App.tsx > tmp.tsx && mv tmp.tsx src/App.tsx
