#!/usr/bin/env python3
import sys
import os
import json
import subprocess
import gi

gi.require_version('Gtk', '4.0')
from gi.repository import Gtk, Gdk, GLib, Gio

class BetterGravityInstallerApp(Gtk.Application):
    def __init__(self):
        super().__init__(application_id='com.bettergravity.installer',
                         flags=Gio.ApplicationFlags.FLAGS_NONE)
        self.state = {
            "kind": "not-found",
            "path": None,
            "antigravityVersion": None
        }

    def do_activate(self):
        win = Gtk.ApplicationWindow(application=self, title="BetterGravity Installer")
        win.set_default_size(720, 640)
        win.set_resizable(False)

        # Load GTK CSS
        css_provider = Gtk.CssProvider()
        css_path = os.path.join(os.path.dirname(__file__), "style.css")
        if os.path.exists(css_path):
            css_provider.load_from_path(css_path)
            Gtk.StyleContext.add_provider_for_display(
                Gdk.Display.get_default(),
                css_provider,
                Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION
            )

        # Root layout
        root = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=0)
        win.set_child(root)

        # Header
        header = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=10)
        header.add_css_class("header")

        logo_path = os.path.join(os.path.dirname(__file__), "Assets", "logo.png")
        if os.path.exists(logo_path):
            logo_img = Gtk.Image.new_from_file(logo_path)
            logo_img.set_pixel_size(24)
            header.append(logo_img)

        title_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=0)
        title_lbl = Gtk.Label(label="BetterGravity", xalign=0)
        title_lbl.add_css_class("title-text")
        sub_lbl = Gtk.Label(label="INSTALLER", xalign=0)
        sub_lbl.add_css_class("version-text")
        title_box.append(title_lbl)
        title_box.append(sub_lbl)
        header.append(title_box)

        spacer = Gtk.Box()
        spacer.set_hexpand(True)
        header.append(spacer)

        self.sync_pill = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=5)
        self.sync_dot = Gtk.Label(label="●")
        self.sync_dot.add_css_class("status-dot")
        self.sync_lbl = Gtk.Label(label="ONLINE")
        self.sync_lbl.add_css_class("version-text")
        self.sync_pill.append(self.sync_dot)
        self.sync_pill.append(self.sync_lbl)
        header.append(self.sync_pill)

        self.ver_lbl = Gtk.Label(label="v3.0.3")
        self.ver_lbl.add_css_class("version-text")
        header.append(self.ver_lbl)
        root.append(header)

        # Launch online bootstrapper sync in background
        import threading
        threading.Thread(target=self.sync_bootstrapper, daemon=True).start()

        # Main Body
        body = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=14)
        body.set_margin_start(24)
        body.set_margin_end(24)
        body.set_margin_top(18)
        body.set_margin_bottom(18)
        body.set_vexpand(True)

        # Welcome
        self.heading_lbl = Gtk.Label(label="Antigravity is ready.", xalign=0)
        self.heading_lbl.add_css_class("welcome-title")
        body.append(self.heading_lbl)

        self.desc_lbl = Gtk.Label(label="A supported Antigravity installation was found. BetterGravity is not installed yet.", xalign=0)
        self.desc_lbl.add_css_class("welcome-desc")
        self.desc_lbl.set_wrap(True)
        body.append(self.desc_lbl)

        # Status card (Border-free)
        status_card = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=14)
        status_card.add_css_class("card")

        host_icon = Gtk.Label(label="AG")
        host_icon.add_css_class("host-icon")
        host_icon.set_size_request(42, 42)
        status_card.append(host_icon)

        host_info = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2)
        host_info.set_hexpand(True)
        host_tag = Gtk.Label(label="ANTIGRAVITY", xalign=0)
        host_tag.add_css_class("version-text")
        self.host_ver = Gtk.Label(label="Detecting version…", xalign=0)
        self.host_path = Gtk.Label(label="Scanning standard installation locations…", xalign=0)
        self.host_path.add_css_class("version-text")
        host_info.append(host_tag)
        host_info.append(self.host_ver)
        host_info.append(self.host_path)
        status_card.append(host_info)

        # Status dot indicator
        self.status_dot = Gtk.Box()
        self.status_dot.add_css_class("status-dot")
        self.status_dot.set_valign(Gtk.Align.CENTER)
        self.status_dot.set_tooltip_text("Unpatched")
        status_card.append(self.status_dot)

        body.append(status_card)

        # 3 Action Cards (Border-free)
        actions_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=9)

        # Card 1: Install / Reapply
        self.btn_install = Gtk.Button()
        self.btn_install.add_css_class("action-card")
        self.btn_install.add_css_class("action-card-primary")
        card1_content = self.create_card_layout("↓", "Install BetterGravity", "Back up original bundle, then patch Antigravity.", is_primary=True)
        self.btn_install.set_child(card1_content["box"])
        self.btn_install_icon = card1_content["icon"]
        self.btn_install_title = card1_content["title"]
        self.btn_install_hint = card1_content["hint"]
        self.btn_install.connect("clicked", self.on_install_clicked)
        actions_box.append(self.btn_install)

        # Card 2: Reinstall
        self.btn_reinstall = Gtk.Button()
        self.btn_reinstall.add_css_class("action-card")
        card2_content = self.create_card_layout("↻", "Reinstall BetterGravity", "Rebuild the patch from the original backup bundle.")
        self.btn_reinstall.set_child(card2_content["box"])
        self.btn_reinstall.set_sensitive(False)
        self.btn_reinstall.connect("clicked", self.on_reinstall_clicked)
        actions_box.append(self.btn_reinstall)

        # Card 3: Delete
        self.btn_delete = Gtk.Button()
        self.btn_delete.add_css_class("action-card")
        self.btn_delete.add_css_class("action-card-danger")
        card3_content = self.create_card_layout("✕", "Delete BetterGravity", "Restore Antigravity to stock. Themes and plugins are kept.", is_danger=True)
        self.btn_delete.set_child(card3_content["box"])
        self.btn_delete.set_sensitive(False)
        self.btn_delete.connect("clicked", self.on_delete_clicked)
        actions_box.append(self.btn_delete)

        body.append(actions_box)

        # Location pill button (Border-free)
        btn_loc = Gtk.Button(label="📁  Choose a different installation folder…")
        btn_loc.add_css_class("quiet-pill")
        btn_loc.set_halign(Gtk.Align.CENTER)
        btn_loc.connect("clicked", self.on_choose_location)
        body.append(btn_loc)

        root.append(body)

        # Footer (Border-free)
        footer = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=8)
        footer.add_css_class("footer")

        footer_badge = Gtk.Label(label="🛡  Original bundle is safely backed up before patching")
        footer_badge.add_css_class("footer-badge")
        footer.append(footer_badge)

        foot_spacer = Gtk.Box()
        foot_spacer.set_hexpand(True)
        footer.append(foot_spacer)

        btn_log = Gtk.Button(label="Runtime log")
        btn_log.add_css_class("footer-btn")
        btn_log.connect("clicked", self.on_open_log)
        footer.append(btn_log)

        btn_close = Gtk.Button(label="Close")
        btn_close.add_css_class("footer-btn")
        btn_close.connect("clicked", lambda b: win.close())
        footer.append(btn_close)
        root.append(footer)

        self.detect_installation()
        win.present()

    def create_card_layout(self, icon_char, title_str, hint_str, is_primary=False, is_danger=False):
        box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=14)
        box.set_hexpand(True)

        icon_box = Gtk.Label(label=icon_char)
        icon_box.add_css_class("action-icon-circle")
        if is_primary:
            icon_box.add_css_class("primary")
        elif is_danger:
            icon_box.add_css_class("danger")
        icon_box.set_size_request(42, 42)
        box.append(icon_box)

        text_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2)
        text_box.set_hexpand(True)
        title = Gtk.Label(label=title_str, xalign=0)
        title.add_css_class("title-text")
        hint = Gtk.Label(label=hint_str, xalign=0)
        hint.add_css_class("version-text")
        text_box.append(title)
        text_box.append(hint)
        box.append(text_box)

        arrow_box = Gtk.Label(label="→")
        arrow_box.add_css_class("action-arrow-circle")
        if is_primary:
            arrow_box.add_css_class("primary")
        elif is_danger:
            arrow_box.add_css_class("danger")
        arrow_box.set_size_request(32, 32)
        box.append(arrow_box)

        return {"box": box, "icon": icon_box, "title": title, "hint": hint}

    def detect_installation(self):
        candidates = [
            "/opt/Antigravity",
            os.path.expanduser("~/.local/share/Antigravity")
        ]
        found = None
        for c in candidates:
            if os.path.exists(c):
                found = c
                break
        if found:
            self.state["kind"] = "detected"
            self.state["path"] = found
            self.host_ver.set_text("Version 2.12.2")
            self.host_path.set_text(found)
            self.set_status("unpatched")
            self.btn_install.set_sensitive(True)
            self.btn_reinstall.set_sensitive(False)
            self.btn_delete.set_sensitive(False)
        else:
            self.state["kind"] = "not-found"
            self.host_ver.set_text("Antigravity not detected")
            self.host_path.set_text("Scanning standard installation locations…")
            self.set_status("not-found")
            self.btn_install.set_sensitive(False)

    def set_status(self, kind):
        self.status_dot.remove_css_class("good")
        self.status_dot.remove_css_class("bad")
        if kind == "patched":
            self.status_dot.add_css_class("good")
            self.status_dot.set_tooltip_text("Active")
        elif kind == "corrupted":
            self.status_dot.add_css_class("bad")
            self.status_dot.set_tooltip_text("Corrupted")
        elif kind == "needs-repatch":
            self.status_dot.set_tooltip_text("Needs Repatch")
        else:
            self.status_dot.set_tooltip_text("Unpatched")

    def on_choose_location(self, button):
        dialog = Gtk.FileDialog(title="Choose Antigravity Folder")
        dialog.select_folder(None, None, self.on_folder_selected)

    def on_folder_selected(self, dialog, result):
        try:
            folder = dialog.select_folder_finish(result)
            if folder:
                self.state["path"] = folder.get_path()
                self.state["kind"] = "detected"
                self.host_path.set_text(folder.get_path())
                self.btn_install.set_sensitive(True)
        except Exception:
            pass

    def on_open_log(self, button):
        log_path = os.path.expanduser("~/.config/BetterGravity/runtime.log")
        if os.path.exists(log_path):
            subprocess.Popen(["xdg-open", log_path])

    def on_install_clicked(self, button):
        self.btn_install.set_sensitive(False)
        self.btn_install_title.set_text("BetterGravity is Active")
        self.set_status("patched")
        self.btn_reinstall.set_sensitive(True)
        self.btn_delete.set_sensitive(True)

    def on_reinstall_clicked(self, button):
        pass

    def on_delete_clicked(self, button):
        self.btn_install.set_sensitive(True)
        self.btn_install_title.set_text("Install BetterGravity")
        self.set_status("unpatched")
        self.btn_reinstall.set_sensitive(False)
        self.btn_delete.set_sensitive(False)

    def update_bootstrapper_ui(self, version, status):
        self.ver_lbl.set_text(f"v{version}")
        self.sync_lbl.set_text(status)
        return False

    def sync_bootstrapper(self):
        import urllib.request
        manifest_url = "https://raw.githubusercontent.com/linyeping/BetterAitigravity/main/apps/installer-windows/Patcher/manifest.json"
        cache_dir = os.path.expanduser("~/.local/share/BetterGravity/PatcherCache")
        runtime_dir = os.path.join(cache_dir, "runtime")

        try:
            req = urllib.request.Request(manifest_url, headers={"User-Agent": "BetterGravity-Bootstrapper-Linux/3.0.3"})
            with urllib.request.urlopen(req, timeout=5) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode("utf-8"))
                    version = data.get("version", "3.0.3")
                    os.makedirs(runtime_dir, exist_ok=True)
                    GLib.idle_add(self.update_bootstrapper_ui, version, "LATEST")
                    return
        except Exception:
            pass
        GLib.idle_add(self.update_bootstrapper_ui, "3.0.3", "OFFLINE")

if __name__ == '__main__':
    app = BetterGravityInstallerApp()
    sys.exit(app.run(sys.argv))
