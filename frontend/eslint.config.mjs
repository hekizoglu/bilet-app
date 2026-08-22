import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // ─────────────────────────────────────────────
      // Proje kararları (2026-08-22)
      // ─────────────────────────────────────────────
      // 1) no-explicit-any → warn: kod tabanı büyük; `any`'ler kademeli olarak
      //    tiplendiriliyor. Yeni yazılan kodda `any` kullanımı kaçınılmalıdır.
      //    Hedef: ileride tekrar 'error' seviyesine çekmek.
      "@typescript-eslint/no-explicit-any": "warn",

      // 2) no-unescaped-entities → off: Türkçe içerikte kesme işareti (')
      //    çok yaygın (Ayşe'nin, 30'lu vb.); &apos; kaçışları okunabilirliği bozar.
      "react/no-unescaped-entities": "off",

      // 3) React Compiler kuralları → warn: bu kurallar useEffect içinde
      //    setState ile veri çekme (standart fetch pattern'i) ve eski state
      //    tabanlı güncellemelerde yanlış pozitif üretiyor. Kod tabanı kademeli
      //    olarak React Compiler uyumlu hale getirilirken error yerine warn.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/purity": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
