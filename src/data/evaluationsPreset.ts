import { EvaluationExam } from "../types";

export const PRESET_EVALUATIONS: EvaluationExam[] = [
  {
    id: "eval-eko-01",
    title: "Evaluasi BAB 1: Konsep Dasar Ilmu Ekonomi & Kelangkaan",
    description: "Evaluasi pemahaman konsep dasar ilmu ekonomi, prinsip ekonomi, tindakan ekonomi, dan masalah kelangkaan sumber daya.",
    subject: "EKONOMI",
    className: "Semua Kelas",
    targetClasses: ["XII-C2", "XII-C3", "XII-C4", "XII-D4"],
    durationMinutes: 15,
    token: "EKO01",
    bab: "BAB 1: Konsep Dasar Ilmu Ekonomi",
    status: "aktif",
    isSecureMode: true,
    createdAt: "2026-09-01T08:00:00Z",
    questions: [
      {
        id: "q1",
        type: "pg",
        question: "Inti dari masalah ekonomi yang dihadapi manusia dalam kehidupan sehari-hari adalah...",
        options: [
          "A. Kebutuhan manusia terbatas sedangkan alat pemuas kebutuhan tidak terbatas",
          "B. Kebutuhan manusia tidak terbatas sedangkan alat pemuas kebutuhan terbatas",
          "C. Jumlah uang yang beredar lebih sedikit daripada jumlah barang",
          "D. Kemajuan teknologi yang terlalu cepat dibandingkan produksi"
        ],
        correctAnswer: "B. Kebutuhan manusia tidak terbatas sedangkan alat pemuas kebutuhan terbatas",
        explanation: "Kelangkaan (scarcity) muncul karena adanya ketidakseimbangan antara kebutuhan manusia yang bersifat tidak terbatas dengan sumber daya / alat pemuas kebutuhan yang jumlahnya terbatas.",
        points: 20
      },
      {
        id: "q2",
        type: "pg_kompleks",
        question: "Pilihlah faktor-faktor yang mempengaruhi timbulnya kelangkaan sumber daya di masyarakat! (Pilih semua yang benar)",
        options: [
          "Keterbatasan kapasitas produksi barang dan jasa",
          "Pertumbuhan penduduk yang pesat melebihi laju produksi",
          "Perkembangan teknologi yang selalu merata di setiap daerah",
          "Bencana alam yang merusak sumber daya alam"
        ],
        correctAnswer: [
          "Keterbatasan kapasitas produksi barang dan jasa",
          "Pertumbuhan penduduk yang pesat melebihi laju produksi",
          "Bencana alam yang merusak sumber daya alam"
        ],
        explanation: "Penyebab kelangkaan antara lain keterbatasan kemampuan produksi, pertumbuhan penduduk, perbedaan letak geografis, serta keterbatasan akibat bencana alam.",
        points: 20
      },
      {
        id: "q3",
        type: "benar_salah",
        question: "Biaya Peluang (Opportunity Cost) adalah nilai dari barang atau kesempatan terbaik yang dikorbankan karena memilih alternatif keputusan ekonomi lainnya.",
        correctAnswer: "Benar",
        explanation: "Pernyataan Benar. Biaya peluang timbul karena adanya pilihan-pilihan akibat kelangkaan.",
        points: 20
      },
      {
        id: "q4",
        type: "isian",
        question: "Sebutkan istilah ilmiah untuk konsep kelangkaan dalam ilmu ekonomi!",
        correctAnswer: "scarcity",
        explanation: "Kelangkaan dikenal dengan istilah Scarcity.",
        points: 20
      },
      {
        id: "q5",
        type: "essay",
        question: "Jelaskan secara singkat perbedaan antara kebutuhan primer, sekunder, dan tersier beserta contohnya di lingkungan sekolah!",
        correctAnswer: "Kebutuhan primer adalah kebutuhan pokok (misal: makanan/seragam), sekunder adalah penunjang (misal: buku tulis/penu), tersier adalah barang mewah (misal: smartphone flagship).",
        explanation: "Jawaban dinilai berdasarkan kejelasan definisi dan relevansi contoh dalam kehidupan siswa.",
        points: 20
      }
    ]
  },
  {
    id: "eval-eko-02",
    title: "Evaluasi BAB 2: Masalah Pokok Ekonomi & Sistem Ekonomi",
    description: "Evaluasi sistem ekonomi tradisional, komando/terpusat, pasar/liberal, dan sistem ekonomi campuran serta Indonesia.",
    subject: "EKONOMI",
    className: "Semua Kelas",
    targetClasses: ["XII-C2", "XII-C3", "XII-C4", "XII-D4"],
    durationMinutes: 20,
    token: "EKO02",
    bab: "BAB 2: Masalah Pokok Ekonomi & Sistem Ekonomi",
    status: "aktif",
    isSecureMode: true,
    createdAt: "2026-09-02T09:00:00Z",
    questions: [
      {
        id: "q21",
        type: "pg",
        question: "Masalah pokok ekonomi modern mencakup tiga pertanyaan dasar, yaitu...",
        options: [
          "A. What, How, dan For Whom",
          "B. What, Where, dan When",
          "C. Who, How, dan Why",
          "D. Production, Consumption, dan Distribution"
        ],
        correctAnswer: "A. What, How, dan For Whom",
        explanation: "Masalah pokok ekonomi modern: Barang apa yang diproduksi (What), Bagaimana memproduksi (How), dan Untuk siapa barang diproduksi (For Whom).",
        points: 25
      },
      {
        id: "q22",
        type: "pg",
        question: "Ciri utama dari Sistem Ekonomi Komando (Terpusat) adalah...",
        options: [
          "A. Swasta bebas memiliki alat dan sumber produksi",
          "B. Seluruh aktivitas ekonomi dan aset utama dikuasai dan diatur pemerintah",
          "C. Pembagian kerja ditentukan berdasarkan tradisi nenek moyang",
          "D. Harga barang sepenuhnya ditentukan oleh mekanisme pasar"
        ],
        correctAnswer: "B. Seluruh aktivitas ekonomi dan aset utama dikuasai dan diatur pemerintah",
        explanation: "Sistem komando menempatkan pemerintah sebagai pemegang kendali utama seluruh kegiatan ekonomi.",
        points: 25
      },
      {
        id: "q23",
        type: "benar_salah",
        question: "Sistem ekonomi Indonesia berlandaskan Pasal 33 UUD 1945 yang berasaskan kekeluargaan dan demokrasi ekonomi.",
        correctAnswer: "Benar",
        explanation: "Benar, sistem ekonomi Indonesia adalah Sistem Demokrasi Ekonomi Pancasila.",
        points: 25
      },
      {
        id: "q24",
        type: "isian",
        question: "Apakah nama sistem ekonomi yang mengandalkan kebiasaan dan barter barang?",
        correctAnswer: "tradisional",
        explanation: "Sistem ekonomi tradisional mengandalkan adat istiadat dan barter.",
        points: 25
      }
    ]
  },
  {
    id: "eval-eko-03",
    title: "Penilaian Tengah Semester (PTS) Ekonomi XII",
    description: "Ujian Terpadu Evaluasi Tengah Semester Mata Pelajaran Ekonomi Kelas XII dengan Sistem Keamanan Terkunci.",
    subject: "EKONOMI",
    className: "Semua Kelas",
    targetClasses: ["XII-C2", "XII-C3", "XII-C4", "XII-D4"],
    durationMinutes: 30,
    token: "PTS2026",
    bab: "Penilaian Tengah Semester",
    status: "aktif",
    isSecureMode: true,
    createdAt: "2026-09-03T10:00:00Z",
    questions: [
      {
        id: "pts1",
        type: "pg",
        question: "Manakah dari pernyataan berikut yang paling tepat menggambarkan tindakan ekonomi rasional?",
        options: [
          "A. Membeli barang mahal demi gengsi",
          "B. Mengorbankan biaya sekecil-kecilnya untuk hasil seoptimal mungkin",
          "C. Mengabaikan kualitas demi harga serendah mungkin tanpa perhitungan",
          "D. Menghabiskan seluruh pendapatan tanpa menabung"
        ],
        correctAnswer: "B. Mengorbankan biaya sekecil-kecilnya untuk hasil seoptimal mungkin",
        explanation: "Prinsip ekonomi rasional memperhitungkan perbandingan antara pengorbanan dan hasil.",
        points: 20
      },
      {
        id: "pts2",
        type: "pg_kompleks",
        question: "Mana sajakah yang termasuk ke dalam faktor produksi asli? (Pilih semua yang benar)",
        options: [
          "Faktor Produksi Alam (SDA)",
          "Faktor Produksi Tenaga Kerja (SDM)",
          "Faktor Produksi Modal",
          "Faktor Produksi Kewirausahaan"
        ],
        correctAnswer: [
          "Faktor Produksi Alam (SDA)",
          "Faktor Produksi Tenaga Kerja (SDM)"
        ],
        explanation: "Faktor produksi asli terdiri atas Alam dan Tenaga Kerja, sedangkan Modal dan Kewirausahaan adalah faktor produksi turunan.",
        points: 20
      },
      {
        id: "pts3",
        type: "benar_salah",
        question: "Mekanisme pasar (Hukum Penawaran) menyatakan bahwa jika harga naik, maka jumlah barang yang ditawarkan penjual cenderung bertambah.",
        correctAnswer: "Benar",
        explanation: "Benar, sesuai Hukum Penawaran (Ceteris Paribus).",
        points: 20
      },
      {
        id: "pts4",
        type: "isian",
        question: "Tuliskan nama indikator keseimbangan harga pasar tempat berpotongnya kurva permintaan dan penawaran!",
        correctAnswer: "ekuilibrium",
        explanation: "Harga Keseimbangan / Ekuilibrium (Equilibrium Price).",
        points: 20
      },
      {
        id: "pts5",
        type: "essay",
        question: "Jelaskan peran IPTEK dan digitalisasi dalam mengatasi masalah kelangkaan distribusi barang di Indonesia!",
        correctAnswer: "IPTEK dan platform e-commerce mempercepat rantai pasok, transparansi stok, dan memotong biaya distribusi antar wilayah.",
        explanation: "Penilaian berdasarkan gagasan dan contoh nyata e-commerce / e-logistik.",
        points: 20
      }
    ]
  }
];
