# SCSS Architecture - Google Standards

## 📁 Estrutura Proposta (ITCSS + BEM)

```
kanban/
└── styles/
    ├── 00-settings/          # Variáveis globais
    │   ├── _variables.scss   # Cores, tamanhos, breakpoints
    │   └── _tokens.scss       # Design tokens
    │
    ├── 01-tools/              # Mixins e funções
    │   ├── _mixins.scss       # Mixins reutilizáveis
    │   ├── _functions.scss    # Funções SCSS
    │   └── _animations.scss   # Keyframes e animações
    │
    ├── 02-generic/            # Reset e normalize
    │   └── _reset.scss        # Reset específico do componente
    │
    ├── 03-elements/           # Elementos base
    │   └── _base.scss         # Estilos base do kanban
    │
    ├── 04-objects/            # Padrões de layout
    │   ├── _layout.scss       # Grid e containers
    │   └── _scrollbar.scss    # Customização de scrollbars
    │
    ├── 05-components/         # Componentes específicos
    │   ├── _board.scss        # Kanban board principal
    │   ├── _header.scss       # Header section
    │   ├── _column.scss       # Colunas do kanban
    │   ├── _card.scss         # Task cards
    │   ├── _modal.scss        # Modais
    │   ├── _comments.scss     # Sistema de comentários
    │   ├── _buttons.scss      # Botões e ações
    │   ├── _forms.scss        # Formulários
    │   ├── _dropdowns.scss    # Menus dropdown
    │   └── _trash.scss        # Trash zone
    │
    ├── 06-utilities/          # Classes utilitárias
    │   ├── _helpers.scss      # Classes helper
    │   └── _states.scss       # Estados (hover, active, etc)
    │
    ├── 07-themes/             # Temas (opcional)
    │   └── _dark.scss         # Dark mode (futuro)
    │
    └── index.scss             # Arquivo principal de imports
```

## 🎯 Princípios Google/Enterprise

### 1. **Single Responsibility**
- Cada arquivo tem uma única responsabilidade
- Máximo 200 linhas por arquivo
- Nome do arquivo = propósito

### 2. **DRY (Don't Repeat Yourself)**
- Variáveis para valores repetidos
- Mixins para padrões comuns
- Extends para herança de estilos

### 3. **BEM Naming Convention**
```scss
.block {}                 // kanban-board
.block__element {}        // kanban-board__header
.block--modifier {}       // kanban-board--dragging
```

### 4. **Performance First**
- Evitar seletores profundos (máx 3 níveis)
- Usar classes ao invés de tags
- Minimizar especificidade

### 5. **Maintainability**
- Comentários descritivos
- Ordem lógica de propriedades
- Agrupamento por funcionalidade

## 📊 Métricas de Sucesso

| Métrica | Antes | Depois |
|---------|-------|--------|
| **Arquivo único** | 1543 linhas | 0 linhas |
| **Arquivos modulares** | 0 | ~20 arquivos |
| **Média linhas/arquivo** | 1543 | < 100 |
| **Duplicação de código** | Alta | Mínima |
| **Manutenibilidade** | Difícil | Fácil |
| **Reusabilidade** | Baixa | Alta |

## 🔧 Benefícios

1. **Escalabilidade**: Fácil adicionar novos estilos
2. **Manutenção**: Encontrar e corrigir bugs rapidamente
3. **Performance**: CSS otimizado e sem redundância
4. **Colaboração**: Time entende estrutura rapidamente
5. **Testing**: Possível testar estilos isoladamente
6. **Build**: Melhor tree-shaking e minificação