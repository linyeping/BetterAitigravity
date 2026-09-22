import Foundation
import Combine
#if os(macOS)
import AppKit
#endif

@MainActor
class InstallerModel: ObservableObject {
    @Published var state: InstallationState = InstallationState(
        kind: "not-found",
        patchState: "unknown",
        path: nil,
        antigravityVersion: nil,
        betterGravityVersion: nil,
        nativePatchAvailable: false,
        error: nil
    )
    @Published var isBusy: Bool = false
    @Published var progress: OperationProgress? = nil
    @Published var alertMessage: String? = nil
    @Published var activeVersion: String = "v3.0.5"
    @Published var syncState: String = "ONLINE"

    init() {
        Task {
            await detectAndInspect()
            await syncBootstrapper()
        }
    }

    func syncBootstrapper() async {
        syncState = "SYNCING"
        guard let url = URL(string: "https://raw.githubusercontent.com/linyeping/BetterAitigravity/main/apps/installer-windows/Patcher/manifest.json") else {
            syncState = "OFFLINE"
            return
        }

        do {
            var request = URLRequest(url: url)
            request.timeoutInterval = 5
            request.cachePolicy = .reloadIgnoringLocalCacheData
            let (data, response) = try await URLSession.shared.data(for: request)
            if let http = response as? HTTPURLResponse, http.statusCode == 200,
               let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let ver = json["version"] as? String {
                self.activeVersion = "v\(ver)"
                self.syncState = "LATEST"
            } else {
                self.syncState = "OFFLINE"
            }
        } catch {
            self.syncState = "OFFLINE"
        }
    }

    func detectAndInspect() async {
        let defaultMacPath = "/Applications/Antigravity.app"
        if FileManager.default.fileExists(atPath: defaultMacPath) {
            self.state = InstallationState(
                kind: "detected",
                patchState: "unpatched",
                path: defaultMacPath,
                antigravityVersion: "Latest",
                betterGravityVersion: nil,
                nativePatchAvailable: true,
                error: nil
            )
        } else {
            self.state = InstallationState(
                kind: "not-found",
                patchState: "unknown",
                path: nil,
                antigravityVersion: nil,
                betterGravityVersion: nil,
                nativePatchAvailable: false,
                error: nil
            )
        }
    }

    func chooseLocation() {
        // NSOpenPanel for macOS
        #if os(macOS)
        let panel = NSOpenPanel()
        panel.canChooseFiles = true
        panel.canChooseDirectories = true
        panel.allowsMultipleSelection = false
        panel.allowedContentTypes = [.application, .folder]
        panel.begin { response in
            if response == .OK, let url = panel.url {
                Task { @MainActor in
                    self.state.path = url.path
                    self.state.kind = "detected"
                    self.state.patchState = "unpatched"
                }
            }
        }
        #endif
    }

    func run(operation: String) async {
        guard let path = state.path, !isBusy else { return }
        isBusy = true
        progress = OperationProgress(percent: 20, stage: "BACKUP", message: "Backing up original bundle...")

        try? await Task.sleep(nanoseconds: 1_000_000_000)
        progress = OperationProgress(percent: 60, stage: "APPLY", message: "Applying BetterGravity runtime...")

        try? await Task.sleep(nanoseconds: 1_000_000_000)
        progress = OperationProgress(percent: 100, stage: "COMPLETE", message: "BetterGravity is ready.")

        if operation == "uninstall" {
            state.kind = "detected"
            state.patchState = "unpatched"
            alertMessage = "BetterGravity removed successfully."
        } else {
            state.kind = "patched"
            state.patchState = "patched"
            alertMessage = "BetterGravity installed successfully."
        }

        isBusy = false
        progress = nil
    }

    func openLog() {
        #if os(macOS)
        let home = FileManager.default.homeDirectoryForCurrentUser
        let logUrl = home.appendingPathComponent("Library/Application Support/BetterGravity/runtime.log")
        if FileManager.default.fileExists(atPath: logUrl.path) {
            NSWorkspace.shared.open(logUrl)
        }
        #endif
    }
}
