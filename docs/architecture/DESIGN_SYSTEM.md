# Design System — Brain Inteligência Estratégica

Guia de referência completo para reprodução da identidade visual e padrões de layout em novos projetos React + Tailwind CSS + shadcn/ui.

---

## 1. Stack tecnológica

| Camada | Tecnologia |
|---|---|
| Framework | React 18 + TypeScript + Vite |
| Estilização | Tailwind CSS v3 |
| Componentes | shadcn/ui (Radix UI) |
| Ícones | lucide-react |
| Roteamento | react-router-dom v6 |

---

## 2. Logo

### Arquivos
- `assets/logoBrain.png` — logo principal (formato PNG, fundo transparente)
- `assets/braininteligenciaestrategica_logo.jpg` — versão completa com texto

### Uso no layout
```tsx
import brainLogo from '../../../assets/logoBrain.png';

// No cabeçalho da sidebar:
<img src={brainLogo} alt="Brain" className="h-7 w-auto shrink-0" />
```

### Regras de uso
- Altura fixa: `h-7` (28px), largura proporcional automática
- Nunca distorcer as proporções (`w-auto` sempre)
- Ao lado do logo, exibir o nome do sistema em `text-xs font-semibold text-muted-foreground uppercase tracking-widest`

---

## 3. Tipografia

### Fontes (Google Fonts)
```html
<!-- Adicionar no <head> do HTML ou como @import no CSS -->
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Source+Sans+3:wght@300;400;500;600;700&display=swap');
```

| Papel | Família | Pesos disponíveis |
|---|---|---|
| Headings (h1–h6) | Montserrat | 400, 500, 600, 700 |
| Body (texto geral) | Source Sans 3 | 300, 400, 500, 600, 700 |

### Variáveis CSS
```css
--font-heading: 'Montserrat', sans-serif;
--font-body: 'Source Sans 3', sans-serif;
```

### Configuração Tailwind
```ts
fontFamily: {
  heading: ["Montserrat", "sans-serif"],
  body:    ["Source Sans 3", "sans-serif"],
},
```

### Aplicação base
```css
body {
  font-family: var(--font-body);
  -webkit-font-smoothing: antialiased;
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);
  font-weight: 600;
}
```

---

## 4. Paleta de cores

Todas as cores usam variáveis CSS em formato **HSL** (sem `hsl()`), aplicadas via Tailwind. O tema escuro é ativado pela classe `.dark` no elemento `<html>`.

### 4.1 Tema Claro (`:root`)

```css
:root {
  --background:          220 14% 96%;   /* #f2f3f7 — fundo geral */
  --foreground:          221 39% 11%;   /* #111827 — texto geral */

  --card:                0 0% 100%;     /* #ffffff */
  --card-foreground:     221 39% 11%;

  --popover:             0 0% 100%;
  --popover-foreground:  221 39% 11%;

  --primary:             90 37% 34%;    /* verde sálvia escuro */
  --primary-foreground:  0 0% 100%;

  --secondary:           90 36% 31%;    /* verde sálvia mais escuro */
  --secondary-foreground: 0 0% 100%;

  --muted:               84 27% 92%;    /* cinza esverdeado claro */
  --muted-foreground:    220 9% 46%;

  --accent:              48 95% 49%;    /* amarelo dourado */
  --accent-foreground:   221 39% 11%;

  --destructive:         0 65% 34%;     /* vermelho escuro */
  --destructive-foreground: 0 0% 100%;

  --success:             100 41% 24%;   /* verde escuro */
  --success-foreground:  0 0% 100%;

  --info:                213 53% 32%;   /* azul */
  --info-foreground:     0 0% 100%;

  --warning:             43 100% 27%;   /* laranja escuro */
  --warning-foreground:  0 0% 100%;

  --border:              220 13% 91%;
  --input:               220 13% 91%;
  --ring:                90 37% 34%;

  --radius: 0.75rem;

  /* Sidebar */
  --sidebar-background:         0 0% 100%;
  --sidebar-foreground:         221 39% 11%;
  --sidebar-primary:            90 37% 34%;
  --sidebar-primary-foreground: 0 0% 100%;
  --sidebar-accent:             84 27% 92%;
  --sidebar-accent-foreground:  221 39% 11%;
  --sidebar-border:             220 13% 91%;
  --sidebar-ring:               90 37% 34%;
}
```

### 4.2 Tema Escuro (`.dark`)

```css
.dark {
  --background:          225 15% 8%;    /* quase preto azulado */
  --foreground:          214 32% 91%;   /* branco acinzentado */

  --card:                225 20% 13%;
  --card-foreground:     214 32% 91%;

  --popover:             225 20% 13%;
  --popover-foreground:  214 32% 91%;

  --primary:             90 45% 48%;    /* verde sálvia mais claro */
  --primary-foreground:  0 0% 100%;

  --secondary:           90 36% 38%;
  --secondary-foreground: 0 0% 100%;

  --muted:               225 15% 20%;
  --muted-foreground:    220 9% 58%;

  --accent:              48 90% 45%;
  --accent-foreground:   221 39% 11%;

  --destructive:         0 62% 50%;
  --destructive-foreground: 0 0% 100%;

  --success:             100 41% 38%;
  --success-foreground:  0 0% 100%;

  --info:                213 53% 48%;
  --info-foreground:     0 0% 100%;

  --warning:             43 100% 40%;
  --warning-foreground:  0 0% 100%;

  --border:              225 15% 22%;
  --input:               225 15% 22%;
  --ring:                90 45% 48%;

  /* Sidebar dark */
  --sidebar-background:         225 20% 10%;
  --sidebar-foreground:         214 32% 91%;
  --sidebar-primary:            90 45% 48%;
  --sidebar-primary-foreground: 0 0% 100%;
  --sidebar-accent:             225 15% 20%;
  --sidebar-accent-foreground:  214 32% 91%;
  --sidebar-border:             225 15% 22%;
  --sidebar-ring:               90 45% 48%;
}
```

### 4.3 Cores semânticas — referência rápida

| Token | Claro (HSL) | Escuro (HSL) | Uso |
|---|---|---|---|
| `primary` | 90 37% 34% | 90 45% 48% | Ações principais, links ativos |
| `accent` | 48 95% 49% | 48 90% 45% | Hover, destaques, badges |
| `success` | 100 41% 24% | 100 41% 38% | Status OK, confirmações |
| `info` | 213 53% 32% | 213 53% 48% | Informações neutras |
| `warning` | 43 100% 27% | 43 100% 40% | Alertas |
| `destructive` | 0 65% 34% | 0 62% 50% | Erros, ações destrutivas |
| `muted` | 84 27% 92% | 225 15% 20% | Fundos secundários |

---

## 5. Border Radius

```css
--radius: 0.75rem;  /* 12px — valor base */
```

| Classe Tailwind | Valor calculado |
|---|---|
| `rounded-xl` | `var(--radius)` = 12px |
| `rounded-lg` | `calc(var(--radius) - 2px)` = 10px |
| `rounded-md` | `calc(var(--radius) - 4px)` = 8px |
| `rounded-sm` | `calc(var(--radius) - 6px)` = 6px |

---

## 6. Layout e dimensões

### Container
```ts
container: {
  center: true,
  padding: "2rem",
  screens: { "2xl": "1400px" },
},
```

### Sidebar
| Estado | Largura |
|---|---|
| Expandida | `w-64` = 256px |
| Recolhida | `w-14` = 56px |
| Cabeçalho logo | altura `h-7` = 28px |

### Estrutura geral da tela
```
┌──────────────┬────────────────────────────────────┐
│   Sidebar    │           Main Content              │
│  w-64/w-14   │         flex-1 overflow-auto        │
│  h-screen    │         h-screen                    │
└──────────────┴────────────────────────────────────┘
```

### Padrão do wrapper raiz
```tsx
<div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
  <aside className="flex flex-col h-full border-r border-border bg-card transition-all duration-200 shrink-0 print:hidden w-64">
    {/* sidebar */}
  </aside>
  <main className="flex-1 overflow-auto min-w-0">
    {children}
  </main>
</div>
```

---

## 7. Animações

```ts
keyframes: {
  "accordion-down": {
    from: { height: "0" },
    to:   { height: "var(--radix-accordion-content-height)" },
  },
  "accordion-up": {
    from: { height: "var(--radix-accordion-content-height)" },
    to:   { height: "0" },
  },
  "fade-in": {
    from: { opacity: "0", transform: "translateY(4px)" },
    to:   { opacity: "1", transform: "translateY(0)" },
  },
},
animation: {
  "accordion-down": "accordion-down 0.2s ease-out",
  "accordion-up":   "accordion-up 0.2s ease-out",
  "fade-in":        "fade-in 0.3s ease-out",
},
```

Plugin obrigatório: `tailwindcss-animate`

---

## 8. Padrões de navegação (Sidebar)

### Estrutura de dados
```ts
// Item simples
interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  standbyLabel?: string; // ex: "(testes)"
}

// Pasta expansível dentro de um grupo
interface NavFolder {
  type: 'folder';
  id: string;
  label: string;
  icon: React.ReactNode;
  children: NavItem[];
}

// Grupo de categorias (seção do menu)
interface NavGroup {
  id: string;
  label: string;
  icon: React.ReactNode;
  items: (NavItem | NavFolder)[];
}
```

### Classes dos itens de nav

**Item ativo:**
```
bg-primary/10 text-primary font-medium
```

**Item inativo:**
```
text-muted-foreground hover:bg-accent hover:text-foreground
```

**Item base (comum a ambos):**
```
flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors
```

**Label de grupo (seção):**
```
text-xs font-semibold uppercase tracking-wider
```

**Sub-itens (dentro de pasta):**
```
ml-3 pl-2 border-l border-border space-y-0.5
```

### Dark mode toggle
```tsx
// Ativa/desativa classe 'dark' no <html>
document.documentElement.classList.toggle('dark', isDark);
```

---

## 9. Configuração completa dos arquivos

### `tailwind.config.ts`
```ts
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      fontFamily: {
        heading: ["Montserrat", "sans-serif"],
        body:    ["Source Sans 3", "sans-serif"],
      },
      colors: {
        border:     "hsl(var(--border))",
        input:      "hsl(var(--input))",
        ring:       "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT:    "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT:    "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT:    "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT:    "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT:    "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT:    "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT:    "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        success: {
          DEFAULT:    "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        info: {
          DEFAULT:    "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        warning: {
          DEFAULT:    "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        sidebar: {
          DEFAULT:              "hsl(var(--sidebar-background))",
          foreground:           "hsl(var(--sidebar-foreground))",
          primary:              "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent:               "hsl(var(--sidebar-accent))",
          "accent-foreground":  "hsl(var(--sidebar-accent-foreground))",
          border:               "hsl(var(--sidebar-border))",
          ring:                 "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        xl:  "var(--radius)",
        lg:  "calc(var(--radius) - 2px)",
        md:  "calc(var(--radius) - 4px)",
        sm:  "calc(var(--radius) - 6px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to:   { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to:   { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up":   "accordion-up 0.2s ease-out",
        "fade-in":        "fade-in 0.3s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
```

### `src/index.css` (completo)
```css
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Source+Sans+3:wght@300;400;500;600;700&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background:          220 14% 96%;
    --foreground:          221 39% 11%;
    --card:                0 0% 100%;
    --card-foreground:     221 39% 11%;
    --popover:             0 0% 100%;
    --popover-foreground:  221 39% 11%;
    --primary:             90 37% 34%;
    --primary-foreground:  0 0% 100%;
    --secondary:           90 36% 31%;
    --secondary-foreground: 0 0% 100%;
    --muted:               84 27% 92%;
    --muted-foreground:    220 9% 46%;
    --accent:              48 95% 49%;
    --accent-foreground:   221 39% 11%;
    --destructive:         0 65% 34%;
    --destructive-foreground: 0 0% 100%;
    --success:             100 41% 24%;
    --success-foreground:  0 0% 100%;
    --info:                213 53% 32%;
    --info-foreground:     0 0% 100%;
    --warning:             43 100% 27%;
    --warning-foreground:  0 0% 100%;
    --border:              220 13% 91%;
    --input:               220 13% 91%;
    --ring:                90 37% 34%;
    --radius:              0.75rem;
    --sidebar-background:         0 0% 100%;
    --sidebar-foreground:         221 39% 11%;
    --sidebar-primary:            90 37% 34%;
    --sidebar-primary-foreground: 0 0% 100%;
    --sidebar-accent:             84 27% 92%;
    --sidebar-accent-foreground:  221 39% 11%;
    --sidebar-border:             220 13% 91%;
    --sidebar-ring:               90 37% 34%;
    --font-heading: 'Montserrat', sans-serif;
    --font-body:    'Source Sans 3', sans-serif;
  }
}

.dark {
  --background:          225 15% 8%;
  --foreground:          214 32% 91%;
  --card:                225 20% 13%;
  --card-foreground:     214 32% 91%;
  --popover:             225 20% 13%;
  --popover-foreground:  214 32% 91%;
  --primary:             90 45% 48%;
  --primary-foreground:  0 0% 100%;
  --secondary:           90 36% 38%;
  --secondary-foreground: 0 0% 100%;
  --muted:               225 15% 20%;
  --muted-foreground:    220 9% 58%;
  --accent:              48 90% 45%;
  --accent-foreground:   221 39% 11%;
  --destructive:         0 62% 50%;
  --destructive-foreground: 0 0% 100%;
  --success:             100 41% 38%;
  --success-foreground:  0 0% 100%;
  --info:                213 53% 48%;
  --info-foreground:     0 0% 100%;
  --warning:             43 100% 40%;
  --warning-foreground:  0 0% 100%;
  --border:              225 15% 22%;
  --input:               225 15% 22%;
  --ring:                90 45% 48%;
  --sidebar-background:         225 20% 10%;
  --sidebar-foreground:         214 32% 91%;
  --sidebar-primary:            90 45% 48%;
  --sidebar-primary-foreground: 0 0% 100%;
  --sidebar-accent:             225 15% 20%;
  --sidebar-accent-foreground:  214 32% 91%;
  --sidebar-border:             225 15% 22%;
  --sidebar-ring:               90 45% 48%;
}

@layer base {
  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground font-body antialiased;
  }

  h1, h2, h3, h4, h5, h6 {
    font-family: var(--font-heading);
    font-weight: 600;
  }
}
```

### `components.json` (shadcn/ui)
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/index.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

---

## 10. Dependências principais

```json
{
  "dependencies": {
    "react": "^18",
    "react-dom": "^18",
    "react-router-dom": "^6",
    "lucide-react": "latest",
    "class-variance-authority": "latest",
    "clsx": "latest",
    "tailwind-merge": "latest",
    "@radix-ui/react-*": "^1"
  },
  "devDependencies": {
    "tailwindcss": "^3.4",
    "tailwindcss-animate": "latest",
    "autoprefixer": "latest",
    "postcss": "latest",
    "typescript": "latest",
    "vite": "latest"
  }
}
```

### Utilitário `cn` (obrigatório)
```ts
// src/lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

## 11. Checklist de setup para novo projeto

- [ ] Criar projeto: `npm create vite@latest meu-projeto -- --template react-ts`
- [ ] Instalar Tailwind CSS: `npm install -D tailwindcss postcss autoprefixer && npx tailwindcss init -p`
- [ ] Instalar dependências de UI: `npm install lucide-react clsx tailwind-merge class-variance-authority tailwindcss-animate`
- [ ] Instalar shadcn/ui: `npx shadcn@latest init` (usar configurações da seção 9)
- [ ] Copiar `tailwind.config.ts` completo (seção 9)
- [ ] Copiar `src/index.css` completo (seção 9) — inclui fontes, variáveis de cor e base styles
- [ ] Copiar `components.json` (seção 9)
- [ ] Copiar `src/lib/utils.ts` (seção 10)
- [ ] Copiar arquivo de logo: `assets/logoBrain.png`
- [ ] Criar `src/components/layout/AppLayout.tsx` baseado na seção 8
- [ ] Adicionar componentes shadcn necessários: `npx shadcn@latest add button card badge input ...`
- [ ] Configurar alias `@/` no `vite.config.ts`:
  ```ts
  import path from "path";
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } }
  ```

---

## 12. Padrões de componentes comuns

### Card padrão
```tsx
<div className="rounded-xl border border-border bg-card p-6 shadow-sm">
  <h2 className="text-lg font-semibold mb-4">Título</h2>
  {/* conteúdo */}
</div>
```

### Badge de status
```tsx
// success
<span className="inline-flex items-center rounded-md bg-success/10 text-success px-2 py-0.5 text-xs font-medium">
  Ativo
</span>

// warning
<span className="inline-flex items-center rounded-md bg-warning/10 text-warning px-2 py-0.5 text-xs font-medium">
  Pendente
</span>
```

### Botão primário (padrão shadcn)
```tsx
<button className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
  Ação
</button>
```

### Seção de página
```tsx
<div className="p-6 space-y-6 animate-fade-in">
  <div className="space-y-1">
    <h1 className="text-2xl font-semibold">Título da Página</h1>
    <p className="text-sm text-muted-foreground">Descrição breve.</p>
  </div>
  {/* conteúdo */}
</div>
```

---

## 13. Identidade de marca — resumo visual

| Atributo | Valor |
|---|---|
| Cor principal | Verde sálvia (`hsl(90, 37%, 34%)`) |
| Cor de destaque | Amarelo dourado (`hsl(48, 95%, 49%)`) |
| Estilo geral | Clean, profissional, data-driven |
| Personalidade | Técnico mas acessível, tons naturais/corporativos |
| Cantos | Arredondados (12px base) — suave, moderno |
| Fontes | Montserrat (autoridade) + Source Sans 3 (legibilidade) |
| Dark mode | Suportado nativamente via classe `.dark` no `<html>` |
