let activeMenu: HTMLElement | null = null;
let activeCloseHandler: (() => void) | null = null;

export interface ContextMenuItem {
  label: string;
  action: () => void;
  separator?: boolean;
  destructive?: boolean;
}

export function showContextMenu(
  e: React.MouseEvent,
  items: ContextMenuItem[],
) {
  e.preventDefault();
  e.stopPropagation();

  // Close existing menu
  if (activeMenu) {
    activeMenu.remove();
    if (activeCloseHandler) {
      document.removeEventListener("click", activeCloseHandler);
      document.removeEventListener("contextmenu", activeCloseHandler);
    }
  }

  const menu = document.createElement("div");
  menu.className =
    "fixed z-50 bg-popover border rounded-md shadow-md py-1 text-xs min-w-[180px] animate-in fade-in-0 zoom-in-95";
  menu.style.left = `${e.clientX}px`;
  menu.style.top = `${e.clientY}px`;

  // Keep menu within viewport
  requestAnimationFrame(() => {
    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      menu.style.left = `${window.innerWidth - rect.width - 8}px`;
    }
    if (rect.bottom > window.innerHeight) {
      menu.style.top = `${window.innerHeight - rect.height - 8}px`;
    }
  });

  for (const item of items) {
    if (item.separator) {
      const sep = document.createElement("div");
      sep.className = "border-t my-1";
      menu.appendChild(sep);
    }
    const btn = document.createElement("button");
    btn.className = [
      "w-full text-left px-3 py-1.5 hover:bg-muted text-popover-foreground",
      item.destructive ? "text-red-500 hover:text-red-600" : "",
    ]
      .filter(Boolean)
      .join(" ");
    btn.textContent = item.label;
    btn.onclick = () => {
      item.action();
      close();
    };
    menu.appendChild(btn);
  }

  document.body.appendChild(menu);
  activeMenu = menu;

  const close = () => {
    menu.remove();
    activeMenu = null;
    activeCloseHandler = null;
    document.removeEventListener("click", close);
    document.removeEventListener("contextmenu", close);
  };

  activeCloseHandler = close;
  setTimeout(() => {
    document.addEventListener("click", close);
    document.addEventListener("contextmenu", close);
  }, 0);
}
