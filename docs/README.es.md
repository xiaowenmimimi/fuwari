# 🍥 Fuwari (Customized Version)

![Node.js >= 20](https://img.shields.io/badge/node.js-%3E%3D20-brightgreen)
![pnpm >= 9](https://img.shields.io/badge/pnpm-%3E%3D9-blue)

📖 README: [English](./README.en.md) | [简体中文](../README.md) | [日本語](./README.ja.md) | [Español](./README.es.md) | [Indonesia](./README.id.md) | [한국어](./README.ko.md) | [ภาษาไทย](./README.th.md) | [Tiếng Việt](./README.vi.md)

Una versión personalizada de la plantilla de blog estático [Fuwari](https://github.com/saicaca/fuwari) construida con [Astro](https://astro.build).

Manteniendo las animaciones fluidas y el diseño limpio del original, integra funciones prácticas como **Seguimiento de Bangumi**, **Comentarios Waline**, **Estadísticas Umami**, etc. Al mismo tiempo, los **detalles de la UI** han sido profundamente optimizados.

[**🖥️ Vista previa de mi blog**](https://blog.xhwen.cn)

## ✨ Nuevas Funcionalidades

En comparación con el Fuwari original, este proyecto añade principalmente las siguientes características:

- 📺 **Página de Seguimiento Bangumi**
  - Integración con la API de Bangumi para mostrar automáticamente el progreso de visualización.
  - Soporte para filtrado y paginación de animes.
  - La página de detalles muestra la portada, calificación, resumen y otra información del anime.

- 💬 **Sistema de Comentarios Waline**
  - Componente de comentarios Waline incorporado, soportando interacción en las páginas de artículos.
  - Soporte para adaptación automática al modo oscuro.
  - Configuración flexible de la dirección del servidor en `src/config.ts`.

- 📊 **Integración de Estadísticas Umami**
  - Script de estadísticas Umami incorporado, sin necesidad de modificar el HTML manualmente.
  - Soporte para mostrar estadísticas de PV/UV de la página.
  - Manejo automático del reporte de estadísticas al cambiar de ruta (compatible con Swup).

## 🛠️ Guía de Configuración

Todas las opciones de configuración de este proyecto se encuentran en el archivo `src/config.ts` e incluyen comentarios detallados.

## 📝 Sintaxis Extendida de Markdown

Además de la sintaxis Markdown soportada por defecto en Astro, este proyecto extiende el componente de tarjeta de enlace `::link-card`.

**Sintaxis:**

```markdown
::link-card{title="Título" url="URL del enlace" desc="Descripción(Opcional)" image="URL de la imagen(Opcional)" badge="Insignia(Opcional)" target="Destino (`_blank`, `_self`, por defecto `_blank`)(Opcional)"}
```

## 🚀 Ejecución Local

1. Clonar el repositorio:
   ```bash
   git clone https://github.com/xiaowenmimimi/fuwari.git
   cd fuwari
   ```

2. Instalar dependencias:
   ```bash
   pnpm install
   ```

3. Iniciar el servidor de desarrollo:
   ```bash
   pnpm dev
   ```

4. Construir la versión de producción:
   ```bash
   pnpm build
   ```

## ⚡ Comandos Comunes

| Comando | Descripción |
|:---|:---|
| `pnpm install` | Instalar dependencias |
| `pnpm dev` | Iniciar servidor de desarrollo local (`localhost:4321`) |
| `pnpm build` | Construir sitio de producción en `./dist/` |
| `pnpm preview` | Previsualizar la construcción |
| `pnpm new-post <filename>` | Crear un nuevo post |

## 🤝 Agradecimientos

- Autor del tema original: [Saicaca/fuwari](https://github.com/saicaca/fuwari)
- Referencia de la función Bangumi: [Kasuha](https://kasuha.com/posts/fuwari-enhance-ep2/)

## 📄 Licencia

Este proyecto sigue el protocolo de código abierto [MIT License](./LICENSE), ver el archivo LICENSE para más detalles.

Originalmente bifurcado de [saicaca/fuwari](https://github.com/saicaca/fuwari), gracias al autor original.
