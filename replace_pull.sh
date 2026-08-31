#!/bin/bash
awk '
/const pullDataFromCloud = async/ {
    print "  const pullDataFromCloud = async (userParam?: FirebaseUser | null) => {"
    print "    const activeUser = userParam || googleUser;"
    print "    if (!activeUser || isPullingCloudData.current) return;"
    print "    "
    print "    const syncId = getActiveSyncId(activeUser);"
    print "    isPullingCloudData.current = true;"
    print "    setRealtimeSyncStatus(\"syncing\");"
    print "    try {"
    print "      const firestoreData = await loadUserDataFromFirestore(syncId);"
    print "      if (firestoreData && (firestoreData.classes?.length || firestoreData.profile?.name)) {"
    print "        applyCloudData(firestoreData);"
    print "        setRealtimeSyncStatus(\"synced\");"
    print "        addSyncLog(\"Data akun tersinkronisasi dari Cloud\", \"success\");"
    print "        setCloudSyncNotice({"
    print "          message: \"Data Anda berhasil disinkronkan dari Cloud!\","
    print "          type: \"success\""
    print "        });"
    print "        setTimeout(() => setCloudSyncNotice(null), 4000);"
    print "      } else {"
    print "        setRealtimeSyncStatus(\"synced\");"
    print "        addSyncLog(\"Data kosong. Menggunakan penyimpanan Cloud baru.\", \"info\");"
    print "      }"
    print "    } catch (err: any) {"
    print "      console.warn(\"Cloud load warning:\", err);"
    print "      setRealtimeSyncStatus(\"error\");"
    print "      addSyncLog(`Gagal memuat data Cloud: ${err.message}`, \"error\");"
    print "    } finally {"
    print "      isInitialCloudPullComplete.current = true;"
    print "      isPullingCloudData.current = false;"
    print "      setTimeout(() => {"
    print "        setRealtimeSyncStatus(prev => prev === \"synced\" ? \"idle\" : prev);"
    print "      }, 2000);"
    print "    }"
    print "  };"
    skip = 1
    next
}
skip && /^\s*};\s*$/ {
    skip = 0
    next
}
!skip { print }
' src/App.tsx > tmp.tsx && mv tmp.tsx src/App.tsx
