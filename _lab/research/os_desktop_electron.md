# OS, Desktop, and Electron Automation Research

**Role:** OS/Desktop/Electron Specialist (`gemini-3.7-flash-high`)  
**Context:** Independent research for Take-Home Project: Computer-Use Automation System (`/workspace/Project.md`)  
**Date of Access:** 2026-08-16  
**Status:** Complete Research Report  

---

## Thinking Protocol & Evaluative Stance

As the OS/Desktop/Electron specialist for this system, my analysis is anchored directly in the operational constraints and evaluation criteria defined in `/workspace/Project.md`:
1. **Core Problem (§1, §3):** Building an enterprise integration layer for banks and credit unions that automates heterogeneous legacy applications lacking APIs. The system discovers a workflow via an LLM, emits a structured, versioned, reviewable capability artifact (§3.2), and replays it deterministically without an LLM in the decision loop (§3.3), handling runtime errors, human escalation (§3.6), and cross-tenant scale (§3.7).
2. **Evaluative Lens (§7, §178):** The grading team explicitly values *system design, sound trade-offs, correct core loop, robust error handling, and cross-surface generalization in design*. The brief explicitly states: *"We do not reward feature breadth, framework name-dropping, or building scaling infrastructure... We don't expect you to implement multi-tenant or desktop support. We do expect the core abstractions not to paint you into a corner."*
3. **Primary Assessment Question:** Does writing code for an Electron app or OS-level desktop automation strengthen this submission, or does it introduce unforced failure modes in grader reproducibility, permissions, and CI?

---

## Executive Summary & Concrete Recommendation

### Core Recommendation for THIS Take-Home
- **Chosen Implementation Surface:** **Hostile Web Application Mock (Local Server / Bundled Web App)**.
- **Surface Architecture:** Implement a clean, protocol-agnostic `Surface` abstraction with multi-modal locator discrimination (`SemanticLocator`, `VisualLocator`, `PathLocator`, `CoordinateLocator`), a normalized accessibility tree representation, and explicit session handoff hooks.
- **Desktop & Multi-Tenant Role:** Keep native desktop (Windows UIA, macOS AXUIElement, Linux AT-SPI) and Electron thick-client adapters as **first-class architectural designs** in `/REPORT.md` and `_lab/architecture/`, fully proven by the `Surface` interface contract, but **do not force the grader to install native OS desktop dependencies or grant macOS TCC permissions**.

| Approach | Grader Reproducibility | CI / Headless Support | Deterministic Replay Quality | Engineering Cost vs Brief ROI | Verdict |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Hostile Web Mock** (iframes, framesets, dynamic IDs, no test-IDs, table layouts) | **100% (Zero setup, runs anywhere)** | **Native Headless (Docker/CI out of the box)** | **Extremely high (Semantic a11y + DOM fallback + checkpoints)** | **Optimal:** Exercises 100% of §1, §3.1–§3.6 without environmental flakiness | **Viable for this take-home (RECOMMENDED)** |
| **Electron via Playwright `_electron`** | Medium-High (Requires Node + Electron binary) | Supported (via Xvfb on Linux CI) | High (Chromium engine) | Moderate: If driven via DOM it is just a disguised web app; if driven via a11y it adds packaging overhead | **Viable for this take-home (Alternative local target)** |
| **Native OS Input Injection** (PyAutoGUI, nut.js, cliclick) | **Very Low (Breaks on multi-monitor, DPI, OS focus)** | **Fails on headless CI without display server hacks** | **Extremely brittle (Coordinate drift, race conditions)** | **Negative ROI:** Fails §3.3 determinism and breaks on grader machine | **Not viable / avoid (for implementation)** |
| **Native OS a11y APIs** (Win UIA, macOS AX, Linux AT-SPI) | **Platform-locked (Fails across different OS environments)** | **Fails on headless Linux without DBus/X11 setup** | High on native platform, zero cross-platform portability | **Negative ROI:** Exceeds §3.7 scope ("design, not necessarily build") | **Viable only as design story** |

---

## Question 1: Electron / OS-Level Control vs Hostile Web Mock

> **Would implementing Electron or OS-level control strengthen Section 3.7 more than a hostile web mock? Trade-offs for a take-home (grader reproducibility, permissions, CI/headless, evidence).**

### 1.1 The Section 3.7 Evaluation Reality
Section 3.7 states:
> *"Design for heterogeneity & scale (design, not necessarily build)... You will implement against one concrete surface, but your design should have a credible answer to the environment... We don't expect you to implement multi-tenant or desktop support. We do expect the core abstractions not to paint you into a corner."*

Furthermore, Section 7 (Evaluation Criteria) states:
> *"We do not reward feature breadth, framework name-dropping, or building scaling infrastructure... Designing your core abstractions so they could scale to the real environment is valuable; prematurely building that infrastructure is not. A small, correct, well-argued system is the goal."*

Attempting to implement a live native desktop or OS-level automation system does **not** gain extra points under Section 3.7; instead, it introduces severe environmental failure risks that directly threaten Section 3.3 (deterministic replay), Section 3.5 (evidence generation), and Section 6 (grader execution).

### 1.2 Deep Trade-Off Matrix for the Take-Home

```
+---------------------------------------------------------------------------------------------------+
|                                 TAKE-HOME EXECUTION TRADE-OFFS                                    |
+------------------------------------+----------------------------------+---------------------------+
| Dimension                          | Hostile Web Mock                 | Native Desktop / OS-Level |
+------------------------------------+----------------------------------+---------------------------+
| Grader Reproducibility             | Flawless. Runs via `npm test`    | High failure rate: fails  |
|                                    | or Python script on macOS,       | if grader has different   |
|                                    | Linux, Windows, or cloud VM.     | OS, DPI scale, or focus.  |
+------------------------------------+----------------------------------+---------------------------+
| Permissions & OS Sandboxes         | Zero special permissions.        | Blocks on macOS TCC       |
|                                    | Standard user process.           | (Accessibility & Screen   |
|                                    |                                  | Recording prompts).       |
+------------------------------------+----------------------------------+---------------------------+
| CI & Headless Testing              | Native headless browser          | Requires Xvfb, DBus,      |
|                                    | support in GitHub Actions / VM.  | window manager, display   |
|                                    |                                  | server configuration.     |
+------------------------------------+----------------------------------+---------------------------+
| Evidence & Observability           | Pristine: DOM snapshots,         | Coarse: full-screen pixel |
|                                    | AX tree dumps, network HAR,      | raster screenshots and    |
|                                    | element bounding boxes.          | OS process logs only.     |
+------------------------------------+----------------------------------+---------------------------+
| Alignment with Legacy Realities    | Perfect stand-in for framesets,  | Demonstrates raw OS, but  |
|                                    | tables, dynamic IDs, no-test-IDs.| obscures structured logic.|
+------------------------------------+----------------------------------+---------------------------+
```

### 1.3 Detailed Failure Modes of Implementing OS Desktop in a Take-Home
1. **The Grader Environment Trap:** The grader may run the submission on a headless Linux CI runner, an M-series MacBook with Retina 2x scaling, or a Windows workstation with 125% DPI. A desktop coordinate-based automation or OS scripting tool written on one environment will fail catastrophically on another due to DPI coordinate misalignments and window positioning differences.
2. **macOS TCC (Transparency, Consent, and Control) Lockout:** On macOS (especially Sequoia 15+ and Sonoma 14+), synthetic input events require `kTCCServiceAccessibility` and screen capture requires `kTCCServiceScreenCapture`. These permissions cannot be granted programmatically without MDM profiles or manual system settings intervention by the grader. A script that hangs waiting for a TCC prompt fails the grading run.
3. **Headless Execution Impossibility:** True OS-level automation frameworks (PyAutoGUI, cliclick, native Win32 SendInput) require an active desktop windowing server. Running them in a cloud container requires configuring `Xvfb`, `fluxbox`, and fake display drivers—infrastructure that adds zero value to the agentic capability model.
4. **Section 3.7 Strategic Goal:** The evaluator wants to see whether the candidate understands the **seam** between perception/action and capability orchestration. An applicant who provides a robust, typed `Surface` adapter interface with exhaustive architectural documentation for Win32/UIA/AX/AT-SPI proves architectural mastery, while an applicant who hacks together a flaky PyAutoGUI script proves poor engineering judgment.

---

## Question 2: Minimum Viable Desktop Path (If Implemented)

> **What is the minimum viable desktop path if we chose it?**

If a live desktop execution target was strictly mandated or chosen as an optional demonstration target, the only viable, reliable, cross-platform architecture is **Electron via Playwright `_electron`**.

### 2.1 The MVD Architecture: Electron + Playwright `_electron`
```
+-----------------------------------------------------------------------+
|                       MINIMUM VIABLE DESKTOP PATH                      |
|                                                                       |
|  +-----------------------------------------------------------------+  |
|  |                 Agent Loop / Deterministic Replay               |  |
|  +--------------------------------+--------------------------------+  |
|                                   |                                   |
|                                   v                                   |
|  +-----------------------------------------------------------------+  |
|  |                  ElectronSurface Adapter                        |  |
|  |  - Implements standard Surface interface                        |  |
|  |  - Uses Playwright `_electron` API                              |  |
|  |  - Exposes Accessibility Tree via CDP / Playwright a11y         |  |
|  |  - Disables raw DOM cheating to maintain thick-client honesty   |  |
|  +--------------------------------+--------------------------------+  |
|                                   |                                   |
|                                   v                                   |
|  +-----------------------------------------------------------------+  |
|  |             Packaged Legacy Banking Mock (Electron)             |  |
|  |  - Main Process: `electron.launch({ args: ['./app/main.js'] })`|  |
|  |  - Renderer Process: Local legacy core banking UI               |  |
|  |  - Native Menus, Modal Dialogs, Local Storage State            |  |
|  +-----------------------------------------------------------------+  |
+-----------------------------------------------------------------------+
```

### 2.2 Why Electron via Playwright `_electron` is the ONLY Viable Desktop Path
1. **Zero OS Permission Friction:** Unlike PyAutoGUI or OS-level injection tools, Playwright interacts with Electron via the Chrome DevTools Protocol (CDP) and internal Chromium hooks. It does not require macOS Accessibility permissions or Windows UIPI elevation.
2. **CI / Headless Compatibility:** Can run in standard Linux CI environments using `xvfb-run` with zero modifications to the underlying OS window manager.
3. **Strict Element Targeting:** Supports both visual coordinates and the unified Accessibility Tree (`Accessibility.getFullAXTree` via CDP), allowing the system to test non-DOM targeting strategies.

### 2.3 When Electron is an Honest Thick-Client Proxy vs Dishonest Cheating
- **Dishonest Proxy (Cheating):** Treating the Electron app as a standard website by injecting CSS selectors (`page.locator('div.container > button#submit')`) or evaluating arbitrary JavaScript in the renderer DOM. Real legacy bank thick clients (Delphi, WPF, Java Swing, PowerBuilder) do not expose a DOM.
- **Honest Thick-Client Proxy:** Restricting the automation adapter to:
  1. The **Accessibility Tree** (`role`, `name`, `value`, `states`), which directly mirrors Windows UIA, macOS AXUIElement, and Linux AT-SPI.
  2. **Coordinate & Visual Grounding** (screenshots, OCR, Set-of-Marks).
  3. **Synthetic Input Events** (CDP `Input.dispatchMouseEvent`, `Input.dispatchKeyEvent`) that simulate physical keyboard/mouse input rather than calling `.click()` on DOM nodes.

---

## Question 3: Clean `Surface` Interface (Web-Now / Desktop-Later)

> **What is a clean `Surface` interface so web-now / desktop-later does not paint us into a corner? Sketch perceive/act/locator types that are NOT CSS-only.**

To ensure the system never locks itself into web-specific assumptions (such as CSS selectors, XPath, or DOM manipulation), the entire architecture must interact with target applications strictly through an abstract `Surface` contract.

```
                                  +-----------------------+
                                  |   Agent Loop /        |
                                  |   Replay Engine       |
                                  +-----------+-----------+
                                              |
                                              | Uses Surface API
                                              v
                              +-------------------------------+
                              |       <<interface>>           |
                              |          Surface              |
                              +-------------------------------+
                              | + perceive(): Snapshot        |
                              | + act(action): ActionResult   |
                              | + inspect(locator): Element   |
                              | + pauseForHuman(): Token      |
                              | + resumeFromHuman(token)      |
                              +---------------+---------------+
                                              |
            +---------------------------------+--------------------------------+
            |                                 |                                |
            v                                 v                                v
+-----------------------+         +-----------------------+        +-----------------------+
|      WebSurface       |         |    ElectronSurface    |        |    NativeOsSurface    |
| (Playwright/CDP)      |         | (_electron / CDP)     |        | (Windows UIA / AX)    |
+-----------------------+         +-----------------------+        +-----------------------+
```

### 3.1 Type Definitions for Surface, Locators, and Actions

```typescript
/**
 * Protocol-Agnostic Surface Abstraction
 * Decouples discovery and replay from the underlying automation engine.
 */

// ==========================================
// 1. LOCATOR TYPES (NOT CSS-ONLY)
// ==========================================

export type SurfaceLocator =
  | SemanticLocator
  | VisualLocator
  | PathLocator
  | CoordinateLocator
  | CompositeLocator;

/**
 * Universal Accessibility / Semantic Locator.
 * Directly maps across Web A11y, Windows UIA, macOS AXUIElement, Linux AT-SPI.
 */
export interface SemanticLocator {
  kind: 'semantic';
  role: 'button' | 'input' | 'table' | 'row' | 'cell' | 'dialog' | 'menu' | 'tab' | 'heading';
  name?: string | RegExp;          // Accessible name / title / label
  value?: string | RegExp;         // Current value / text content
  identifier?: string;             // AutomationId (UIA) / AXIdentifier (macOS) / id (Web)
  states?: {
    focused?: boolean;
    disabled?: boolean;
    expanded?: boolean;
    checked?: boolean;
    selected?: boolean;
  };
  container?: SemanticLocator;     // Scope search inside a specific parent container/window
}

/**
 * Visual / Coordinate / OCR Locator.
 * For surfaces with broken, missing, or owner-drawn accessibility trees.
 */
export interface VisualLocator {
  kind: 'visual';
  description: string;             // Natural language description for VLM grounding
  ocrText?: string;                // Exact or fuzzy text match from OCR
  anchorText?: string;             // Nearby text anchor (e.g. "Balance:" anchor for value field)
  relativePosition?: 'right_of' | 'left_of' | 'below' | 'above' | 'inside';
  templateImageBase64?: string;    // Visual template matching asset
  normalizedBoundingBox?: {        // Normalized 0.0 - 1.0 coordinates relative to window
    xMin: number;
    yMin: number;
    xMax: number;
    yMax: number;
  };
}

/**
 * Native or Web Path Locator (Fallback).
 */
export interface PathLocator {
  kind: 'path';
  format: 'css' | 'xpath' | 'uia_xpath' | 'ax_path';
  path: string;
}

/**
 * Normalized Coordinate Fallback (Screen-resolution independent).
 */
export interface CoordinateLocator {
  kind: 'coordinate';
  normalizedX: number;             // 0.0 to 1.0 relative to target window width
  normalizedY: number;             // 0.0 to 1.0 relative to target window height
  offsetPixels?: { x: number; y: number };
}

/**
 * Robust Composite Locator with Fallback Pipeline.
 * Solves Section 3.3 runtime determinism.
 */
export interface CompositeLocator {
  kind: 'composite';
  primary: SemanticLocator;
  fallbacks: Array<VisualLocator | PathLocator | CoordinateLocator>;
  strategy: 'first_match' | 'highest_confidence' | 'quorum';
}

// ==========================================
// 2. PERCEPTION TYPES
// ==========================================

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AccessibleNode {
  id: string;
  role: string;
  name?: string;
  value?: string;
  description?: string;
  bounds: BoundingBox;
  states: {
    focused: boolean;
    disabled: boolean;
    readOnly?: boolean;
    expanded?: boolean;
    checked?: boolean;
  };
  supportedActions: Array<'click' | 'setValue' | 'focus' | 'expand' | 'scroll'>;
  children: AccessibleNode[];
}

export interface SurfaceSnapshot {
  timestamp: string;
  screenshotBase64: string;
  viewport: {
    width: number;
    height: number;
    devicePixelRatio: number;
  };
  accessibilityTree: AccessibleNode;
  focusedElementId?: string;
  windowContext: {
    title: string;
    processId?: number;
    isModalActive: boolean;
    activeDialogTitle?: string;
  };
  metadata?: Record<string, unknown>; // Surface-specific extras (e.g. URL if web)
}

// ==========================================
// 3. ACTION TYPES
// ==========================================

export type SurfaceAction =
  | { type: 'click'; target: SurfaceLocator; button?: 'left' | 'right' | 'middle'; clickCount?: number }
  | { type: 'typeText'; target: SurfaceLocator; text: string; clearFirst?: boolean; maskSensitive?: boolean }
  | { type: 'pressKey'; key: string; modifiers?: Array<'Control' | 'Shift' | 'Alt' | 'Meta'> }
  | { type: 'scroll'; target?: SurfaceLocator; direction: 'up' | 'down' | 'left' | 'right'; amount: number }
  | { type: 'hover'; target: SurfaceLocator }
  | { type: 'dragAndDrop'; source: SurfaceLocator; destination: SurfaceLocator }
  | { type: 'wait'; condition: 'element_visible' | 'element_hidden' | 'text_present' | 'idle'; target?: SurfaceLocator; timeoutMs: number };

export interface ActionResult {
  success: boolean;
  durationMs: number;
  observedStateBefore: SurfaceSnapshot;
  observedStateAfter: SurfaceSnapshot;
  error?: {
    code: 'ELEMENT_NOT_FOUND' | 'ACTION_BLOCKED' | 'TIMEOUT' | 'SESSION_LOST' | 'GUARDRAIL_VIOLATION';
    message: string;
    diagnostics?: Record<string, unknown>;
  };
}

// ==========================================
// 4. HITL SESSION CONTROL SEAM
// ==========================================

export interface HandoffToken {
  sessionId: string;
  pausedAtStep: number;
  reason: string;
  snapshotAtPause: SurfaceSnapshot;
  expiresAt: string;
}

export interface ResumeContext {
  token: HandoffToken;
  operatorNotes?: string;
  manualActionsTaken?: string[];
}

// ==========================================
// 5. THE SURFACE INTERFACE
// ==========================================

export interface Surface {
  /**
   * Captures the multi-modal state of the target surface.
   */
  perceive(): Promise<SurfaceSnapshot>;

  /**
   * Executes a primitive UI action against the surface.
   */
  act(action: SurfaceAction): Promise<ActionResult>;

  /**
   * Resolves a locator to verify its existence, bounding box, and confidence.
   */
  inspect(locator: SurfaceLocator): Promise<{
    found: boolean;
    bounds?: BoundingBox;
    matchedNode?: AccessibleNode;
    confidence: number;
  }>;

  /**
   * HITL Seam: Pauses automation and releases input exclusivity to human operator.
   */
  pauseForHumanIntervention(reason: string, currentStepIndex: number): Promise<HandoffToken>;

  /**
   * HITL Seam: Re-acquires automation control following human intervention.
   */
  resumeFromHumanIntervention(context: ResumeContext): Promise<SurfaceSnapshot>;

  /**
   * Closes the surface session and cleans up resources.
   */
  dispose(): Promise<void>;
}
```

---

## Detailed Topic Coverage

### 1. OS Input Injection: Tools, Fragility, HITL, Permissions

#### Analysis of Tools
- **PyAutoGUI (Python):** Cross-platform input synthesizer using platform APIs (`Xlib` on Linux, `Quartz/CoreGraphics` on macOS, `SendInput` on Windows).
  - *Fragility:* Blind coordinate execution; no concept of UI hierarchy or element bounding boxes. Does not support multi-monitor setups reliably (defaults to primary display). Cannot distinguish between an active application window and an unexpected popup stealing focus.
  - *Headless Limitations:* Fails immediately with `KeyError: 'DISPLAY'` on Linux unless wrapped in `xvfb-run` or `pyvirtualdisplay`. Completely impossible to run headlessly on macOS or Windows without virtual display drivers.
- **cliclick (macOS CLI):** Native Objective-C binary that emits synthetic mouse and keyboard events via `CGEventCreateMouseEvent` and `CGEventPost`.
  - *Fragility:* Absolute screen coordinates only; broken by display scaling, menu bar changes, and dock configurations.
- **nut.js / robotjs (Node.js):** Native C++ bindings for input injection.
  - *Fragility:* Native addon compilation headaches (`node-gyp`), breaking across Node.js LTS versions.
- **OS Scripting (AppleScript / PowerShell / xdotool):**
  - *AppleScript / System Events (macOS):* Heavily sandboxed. Requires explicit `kTCCServiceAppleEvents` permission for both the calling process and the target process.
  - *PowerShell / Win32 (Windows):* Direct invocation of `user32.dll` APIs. Vulnerable to User Interface Privilege Isolation (UIPI)—cannot send input from standard user process to an elevated/admin window.
  - *xdotool (Linux X11):* Direct X11 event generation. Completely non-functional under Wayland without XWayland root privileges.

#### Fragility & HITL Collision
- **Global Input Hijacking:** OS injection moves the physical system mouse pointer and synthesizes hardware keypresses. If a human operator moves their mouse while the robot is typing, coordinates are corrupted, resulting in misclicks and broken inputs.
- **Modifier Key Sticking:** If an automation run crashes or is interrupted while pressing `Shift` or `Control`, the modifier key remains logically held down at the OS level, corrupting subsequent human input.

#### Verdict: **Not viable / avoid (for take-home implementation)** | **Viable only as design story (for fallback OS adapter)**.

---

### 2. Native Accessibility Frameworks: macOS, Windows, Linux

```
+---------------------------------------------------------------------------------------------------+
|                              NATIVE ACCESSIBILITY ARCHITECTURES                                   |
+------------------------------------+----------------------------------+---------------------------+
| OS / Framework                     | Core Interfaces & Protocols      | Automation Bridge / Tools |
+------------------------------------+----------------------------------+---------------------------+
| Windows: UI Automation (UIA)       | `IUIAutomation`, `IUIAutomation- | `pywinauto` (UIA backend),|
|                                    | Element`, `IRawElementProvider`, | FlaUI (C#),               |
|                                    | Control Patterns (Invoke, Value) | Windows Application Driver|
+------------------------------------+----------------------------------+---------------------------+
| macOS: ApplicationServices / AX    | `AXUIElementRef`, `AXUIElement-  | `AXUIElementCopyAttribute`|
|                                    | CopyAttributeValue`,             | Swift / PyObjC,           |
|                                    | `AXUIElementPerformAction`       | AppleScript System Events |
+------------------------------------+----------------------------------+---------------------------+
| Linux: AT-SPI2                     | `org.a11y.Bus`, `libatspi`,      | `pyatspi2`, `dogtail`,    |
|                                    | `org.a11y.atspi.Accessible`,     | Cuttlefish                |
|                                    | D-Bus accessibility daemon       |                           |
+------------------------------------+----------------------------------+---------------------------+
```

#### Technical Breakdown
1. **Microsoft UI Automation (UIA):**
   - Built on COM interfaces (`UIAutomationClient.dll`, `UIAutomationCore.dll`).
   - Applications expose UI elements via `IRawElementProviderSimple` and `IRawElementProviderFragment`.
   - Distinguishes controls by `AutomationId`, `Name`, `ClassName`, `ControlType`, and `LocalizedControlType`.
   - Supports structured patterns (`IUIAutomationInvokePattern`, `IUIAutomationValuePattern`, `IUIAutomationSelectionPattern`).
   - *Advantage:* Highly deterministic. WPF, WinForms, Qt, and Win32 controls can be targeted cleanly by ID even if moved or resized.
2. **macOS Accessibility (`AXUIElement`):**
   - C-based API in `ApplicationServices.framework`.
   - Query hierarchy via `AXUIElementCreateApplication(pid)` and `AXUIElementCopyAttributeValue(elem, kAXChildrenAttribute, ...)`.
   - Actions invoked via `AXUIElementPerformAction(elem, kAXPressAction)`.
   - *Limitation:* Requires `kTCCServiceAccessibility`. Many custom legacy macOS applications fail to implement accessibility attributes, resulting in unlabelled elements.
3. **Linux AT-SPI2 (Assistive Technology Service Provider Interface):**
   - Operates over a dedicated D-Bus bus launched by `at-spi-bus-launcher`.
   - Client applications query the registry daemon (`org.a11y.atspi.Registry`) via `libatspi` or `pyatspi`.
   - *Limitation:* Requires the session bus to have `org.a11y.Status.IsEnabled = true`. Many lightweight window managers (i3, Openbox) and headless Docker images lack AT-SPI daemons by default.

#### Stability vs Pixels & Grader Reproducibility
- Accessibility trees are vastly superior to pixel coordinates because they survive window resizing, localization, theme changes, and font scaling.
- However, accessibility APIs are strictly platform-dependent. Testing a Windows UIA script requires a Windows host; testing an AXUIElement script requires a Mac. They cannot provide cross-platform grader reproducibility for a take-home repository.

#### Verdict: **Viable only as design story (for §3.7 Architecture)**.

---

### 3. Screenshot + VLM / Coordinate Grounding on Desktop

#### Frontier Lab APIs & Frameworks
1. **Anthropic Computer Use API (`computer_20241022`, `computer_20250124`, `computer_20251124`):**
   - Claude operates via a structured `computer` tool.
   - Requires setting beta headers (`"betas": ["computer-use-2025-01-24"]`).
   - Actions include `left_click`, `type`, `mouse_move`, `screenshot`, `zoom` (in `computer_20251124`).
   - Model receives a screenshot, infers pixel coordinates `[x, y]` scaled to a target display resolution (e.g. 1024x768), and requests execution.
2. **OpenAI Computer-Using Agent (CUA) / Operator (`computer_use_preview`):**
   - Available via the Responses API using the `computer_use_preview` tool with model `computer-use-preview` or `gpt-5.4`.
   - Model outputs `computer_call` objects containing structured UI operations (`click`, `double_click`, `type`, `scroll`, `keypress`).
   - Harness executes the action against an `AsyncComputer` interface (such as a Daytona desktop container or Playwright instance) and returns a `computer_call_output` screenshot.
3. **Microsoft OmniParser (V1.5 & V2):**
   - Pure vision-based GUI parsing module that converts UI screenshots into structured bounding boxes without requiring underlying HTML or Accessibility trees.
   - Combines an icon detection model (fine-tuned YOLO) with an icon description model (captioning) and OCR (PaddleOCR/EasyOCR).
   - Generates Set-of-Marks (SoM) overlays, allowing the LLM to select an element by numeric ID rather than predicting raw pixel coordinates.

#### Critical Evaluation for Section 3.2 & Section 3.3
- **Discovery vs Replay Dichotomy:**
  - *Discovery (§3.1):* Coordinate grounding / VLM vision is an exceptional tool for exploring an unfamiliar legacy surface during the initial discovery run.
  - *Deterministic Replay (§3.3):* Raw coordinate replay (`click(x=450, y=320)`) is **completely non-deterministic**. If a notification banner appears, a window moves, or a table row expands by 10 pixels, coordinate replay blindly clicks the wrong element or empty space.
  - *Requirement Alignment:* Section 3.2 requires emitting a structured artifact with *stable element/control targeting*. Section 3.3 requires deterministic replay *without the LLM in the loop*. Therefore, the discovery agent must translate visual coordinates into a resilient semantic/accessibility locator or visual anchor rule before saving the capability artifact.

#### Verdict: **Viable for this take-home (as Discovery exploration & visual verification fallback)** | **Not viable / avoid (for raw deterministic replay)**.

---

### 4. Window & Process Control: Focus, Multi-Monitor, macOS TCC

#### Key Engineering Realities
1. **Focus & Window Activation:**
   - On Windows: `SetForegroundWindow` and `BringWindowToTop` are restricted by the OS if another application currently holds user focus (`LockSetForegroundWindow`).
   - On macOS: Requires `NSRunningApplication.activate(options: .activateIgnoringOtherApps)` via Cocoa or `tell application "X" to activate` via AppleScript.
   - On Linux X11: Requires `_NET_ACTIVE_WINDOW` client messages sent via `xdotool windowactivate <XID>` or `wmctrl -a`.
2. **Multi-Monitor Coordinate Systems:**
   - Windows and macOS place multiple monitors in a virtual desktop coordinate space. Secondary monitors can have negative coordinate origins (e.g., `x = -1920, y = 0`).
   - Retina / HiDPI Scaling: macOS uses points (logical 2x scaling), Windows uses DPI awareness flags (Per-Monitor V2 DPI scaling). Injecting raw pixel coordinates without DPI conversion leads to clicks landing at half or double the intended distance.
3. **macOS TCC Permissions Mechanics:**
   - SQLite databases at `~/Library/Application Support/com.apple.TCC/TCC.db` protected by System Integrity Protection (SIP).
   - `kTCCServiceAccessibility` gates input simulation.
   - `kTCCServiceScreenCapture` gates screen recording. In macOS 15 (Sequoia), screen capture grants trigger recurring system prompts every 30 days.

#### Verdict: **Viable only as design story (for §3.7 Architecture)**.

---

### 5. Electron: Playwright `_electron` / CDP vs Opaque Desktop

#### Automation Modalities
1. **Playwright `_electron` (`@playwright/test`):**
   - Launches Electron using `electron.launch({ args: ['main.js'] })`.
   - Exposes `ElectronApplication` and direct `Page` instances for all `BrowserWindow` renderer frames.
   - Bypasses all OS-level window management and input injection hurdles.
2. **Chrome DevTools Protocol (CDP `--remote-debugging-port`):**
   - Any packaged Electron application launched with `--remote-debugging-port=9222` exposes a standard WebSocket debugging endpoint.
   - Automation connects via `chromium.connectOverCDP('http://localhost:9222')`.
3. **Treating Electron as Opaque Desktop:**
   - Driving the Electron window purely via external OS Accessibility (UIA/AX) or visual screenshots.

#### Evaluation as an "Honest Bank Thick-Client Proxy"
- If an Electron app is automated using DOM CSS selectors (`#account-table tr:nth-child(2)`), it is **not** an honest thick-client proxy; it is simply a standard web page wrapped in an Electron frame.
- It becomes an **honest thick-client proxy** when the automation adapter is restricted to:
  - The accessibility snapshot (`page.accessibility.snapshot()`).
  - Screen pixel capture and coordinate input events.
  - Synthetic input dispatch via CDP (`Input.dispatchMouseEvent`).

#### Verdict: **Viable for this take-home (as an optional local mock target)** | **Hostile Web is strictly preferred for zero-setup execution**.

---

### 6. Desktop UI Frameworks: Design Comparisons for Surface Adapter

```
+---------------------------------------------------------------------------------------------------+
|                            DESKTOP UI FRAMEWORKS ADAPTER MAPPING                                  |
+-------------------+---------------------------+---------------------------------------------------+
| Framework         | Internal Rendering Model  | Primary Accessibility / Automation Seam           |
+-------------------+---------------------------+---------------------------------------------------+
| Tauri             | OS Webview (WebView2 on   | Heterogeneous: CDP on Windows/Linux; WKWebView    |
|                   | Windows, WKWebView on     | Safari Web Inspector on macOS. Must use OS a11y   |
|                   | macOS, WebKitGTK on Linux)| (UIA/AX) or visual grounding for unified control. |
+-------------------+---------------------------+---------------------------------------------------+
| Qt (Widgets/QML)  | Direct 2D/3D Raster Engine| `QAccessibleInterface` plugin architecture.       |
|                   | (Bypasses OS widgets)     | Maps to Windows UIA, macOS NSAccessibility, and   |
|                   |                           | Linux AT-SPI. Automated via Squish or native a11y.|
+-------------------+---------------------------+---------------------------------------------------+
| WPF / WinForms    | Windows GDI+ / DirectX /  | Native Windows UI Automation (UIA) Providers      |
|                   | MilCore rendering engine  | (`AutomationPeer`, `IRawElementProviderSimple`).  |
|                   |                           | Highly deterministic via `AutomationId`.          |
+-------------------+---------------------------+---------------------------------------------------+
| Java Swing / AWT  | Custom Lightweight Java2D | **Java Access Bridge (JAB)**. Translates internal |
|                   | Drawing Pipeline          | `AccessibleContext` to Windows UIA / Assistive API|
|                   |                           | (requires enabling JAB in `accessibility.properties`).|
+-------------------+---------------------------+---------------------------------------------------+
```

#### Key Architecture Lessons for Section 3.7
1. **The Invariant Seam:** Across WPF, Qt, Java Swing, and Web, the only common structural contract exposed across all frameworks is the **Accessibility Tree (Role, Name, Value, States, Actions)**.
2. **Owner-Drawn Canvas Trap:** When legacy apps use custom Canvas/DirectX drawing without accessibility annotations (common in terminal emulators and legacy charts), the system must seamlessly fall back to **Visual / OCR / Anchor-based Grounding**.
3. **The Adapter Hierarchy:**
   - Level 1: Semantic / Accessibility Tree (Primary).
   - Level 2: Visual OCR & Relative Anchoring (Secondary).
   - Level 3: Normalized Coordinates & Checkpoints (Fallback).

#### Verdict: **Viable only as design story (Core of §3.7 in `/REPORT.md`)**.

---

### 7. Same-Session HITL on Desktop & Electron Windows

Section 3.6 requires:
> *"Take control of the live session. Let the human operate the same live session the automation was using — not a fresh one — perform the manual steps, and then hand control back so the run can resume or complete. Preserve context and evidence across the handoff, and record what the human did."*

```
+---------------------------------------------------------------------------------------------------+
|                                SAME-SESSION HITL CONTROL TRANSFER                                 |
|                                                                                                   |
|  AUTOMATION RUNNING              ESCALATION TRIGGERED             OPERATOR TAKEOVER               |
|  +------------------+           +--------------------+           +--------------------+           |
|  | Agent / Replay   |           | Surface Adapter    |           | Human Operator     |           |
|  | executing steps  |           | pauses event loop  |           | interacts with live|           |
|  +--------+---------+           +---------+----------+           | target window      |           |
|           |                               |                      +---------+----------+           |
|           | Step stuck / risky action     | Release exclusivity            |                      |
|           +------------------------------>+------------------------------->+                      |
|                                                                            |                      |
|                                                                            | Manual inputs done   |
|  RESUME & RECONCILE              STATE RE-ACQUISITION                      | Operator signals     |
|  +------------------+           +--------------------+                     | "Resume" in CLI/UI   |
|  | Automation       |<----------| Surface captures   |<--------------------+                      |
|  | continues flow   |           | delta & re-verifies|                                            |
|  +------------------+           +--------------------+                                            |
+---------------------------------------------------------------------------------------------------+
```

#### Seam Implementation Mechanics
1. **Web / Electron Headed Window:**
   - Automation detects a stuck condition (e.g. unexpected modal, CAPTCHA, unresolvable locator, high-risk step).
   - Automation issues `pauseForHumanIntervention(reason, stepIndex)` on the `Surface`.
   - Automation stops all synthetic event dispatch and outputs a structured escalation message to the console / operator dashboard.
   - The live browser / Electron window remains open in headed mode. The human operator clicks and types directly into the window.
   - The human signals resumption via CLI (`press [ENTER] to resume`) or operator console button.
   - The `Surface` takes a fresh `perceive()` snapshot, computes the state diff (new URL, closed dialogs, updated fields), logs the intervention in the evidence trail, and resumes deterministic replay or agent discovery.
2. **OS-Level Desktop Window:**
   - Automation releases mouse/keyboard hooks.
   - Target application window is brought to foreground.
   - Human performs manual interaction.
   - Upon resume signal, automation re-verifies window PID and active window title before proceeding.

---

## Options Evaluation Matrix

| Technology / Pattern | Status for THIS Take-Home | Justification |
| :--- | :--- | :--- |
| **Hostile Web Mock Surface** | **Viable for this take-home (RECOMMENDED)** | Zero setup friction for grader; 100% reproducible; supports CI/headless; fully exercises legacy framesets, dynamic IDs, and error recovery. |
| **Electron via Playwright `_electron`** | **Viable for this take-home (Alternative local target)** | Cleanest desktop execution if mandated; runs via CDP without OS permission prompts; supports headless execution via Xvfb. |
| **Normalized `Surface` Adapter Interface** | **Viable for this take-home (MANDATORY ARCHITECTURE)** | Decouples capability artifacts and replay engine from specific UI protocols; guarantees web-now / desktop-later viability. |
| **Visual / OCR / Anchor Locators** | **Viable for this take-home (Discovery & Fallback)** | Essential for discovering and targeting unlabelled or legacy UI elements without clean IDs. |
| **PyAutoGUI / cliclick / nut.js** | **Not viable / avoid** | Global cursor hijacking, fragile screen coordinates, breaks on headless CI, destroyed by DPI/resolution differences. |
| **Raw Pixel Coordinate Replay** | **Not viable / avoid** | Violates Section 3.3 requirement for deterministic replay without model re-reasoning; breaks on layout drift. |
| **Native Windows UIA / macOS AXUIElement** | **Viable only as design story** | Platform-locked; impossible to run cross-platform in grader environments; excellent architectural comparison for §3.7. |
| **Linux AT-SPI2 Direct Scripting** | **Viable only as design story** | Requires active D-Bus accessibility daemon; broken on standard headless containers without custom setup. |
| **Tauri / Qt / Java Swing Native Drivers** | **Viable only as design story** | Demonstrates deep domain knowledge of enterprise banking surfaces in `/REPORT.md` without bloat. |

---

## Human Gates & Architectural Recommendations

### Gate G1: Target Surface Recommendation
- **Recommendation:** **Local Hostile Web Application Mock (Bundled Express/Fastify server or static local bundle)**.
- **Why:** Meets 100% of the requirements in Section 1, 3.1, 3.3, 3.4, 3.5, 3.6, and 4. Exercises legacy HTML quirks (nested tables, iframes, dynamic random IDs, missing test-IDs, modal popups, session expiry) with **zero external network dependencies, zero risk of public ToS violations, zero API key credential leaks, and 100% grader execution reliability**.

### Gate G12: Scope Cuts (Web-Now vs Implement Electron/OS)
- **Recommendation:** **Web-Now with Unified Surface Seam + Comprehensive Desktop Design Architecture**.
- **Scope Cut Justification:**
  1. *What we implement:* An end-to-end working vertical slice against the hostile web mock using Playwright, driven by a protocol-agnostic `Surface` interface that uses Semantic Accessibility Locators, Visual OCR fallbacks, and multi-step recovery.
  2. *What we deliberately cut from implementation:* Native C++ / Objective-C / Win32 OS input injection hooks and native desktop packaging.
  3. *Why this satisfies the brief:* Section 3.7 explicitly asks for a *credible design story* for desktop heterogeneity. Building native desktop plumbing wastes time on OS-specific window managers and breaks grader CI, directly violating the instruction in Section 7: *"Designing your core abstractions so they could scale to the real environment is valuable; prematurely building that infrastructure is not."*

---

## Authoritative Citations & References

*All citations verified with primary/official documentation as of access date 2026-08-16.*

1. **Microsoft Playwright Electron Automation Documentation**  
   *URL:* [https://playwright.dev/docs/api/class-electron](https://playwright.dev/docs/api/class-electron)  
   *Details:* Official API docs for `_electron.launch()`, `ElectronApplication`, `firstWindow()`, and CDP integration. (Accessed: 2026-08-16).
2. **Electron Automated Testing Official Tutorial**  
   *URL:* [https://electronjs.org/docs/latest/tutorial/automated-testing](https://electronjs.org/docs/latest/tutorial/automated-testing)  
   *Details:* Electron testing guidance using Playwright and Chrome DevTools Protocol. (Accessed: 2026-08-16).
3. **Microsoft UI Automation Architecture & Provider Interfaces**  
   *URL:* [https://learn.microsoft.com/en-us/windows/win32/winauto/entry-uiauto-win32](https://learn.microsoft.com/en-us/windows/win32/winauto/entry-uiauto-win32)  
   *Details:* Win32 UI Automation architecture, `IRawElementProviderSimple`, `IUIAutomation`, and COM control patterns. (Accessed: 2026-08-16).
4. **Apple Developer Documentation: ApplicationServices AXUIElement**  
   *URL:* [https://developer.apple.com/documentation/applicationservices/axuielement](https://developer.apple.com/documentation/applicationservices/axuielement)  
   *Details:* macOS Accessibility C APIs, `AXUIElementCopyAttributeValue`, `AXUIElementPerformAction`. (Accessed: 2026-08-16).
5. **Freedesktop.org AT-SPI2 Core Specification**  
   *URL:* [https://www.freedesktop.org/wiki/Accessibility/AT-SPI2/](https://www.freedesktop.org/wiki/Accessibility/AT-SPI2/)  
   *Details:* D-Bus protocol for Linux desktop accessibility, `org.a11y.Bus` and `libatspi`. (Accessed: 2026-08-16).
6. **Anthropic Claude Computer Use Tool Reference**  
   *URL:* [https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool)  
   *Details:* `computer_20250124` and `computer_20251124` tool parameters, coordinate systems, action types. (Accessed: 2026-08-16).
7. **OpenAI Computer Use Guide & API Documentation**  
   *URL:* [https://developers.openai.com/api/docs/guides/tools-computer-use](https://developers.openai.com/api/docs/guides/tools-computer-use)  
   *Details:* `computer_use_preview` tool, Responses API loop, `AsyncComputer` interface specification. (Accessed: 2026-08-16).
8. **Microsoft Research: OmniParser for Pure Vision Based GUI Agents**  
   *URL:* [https://arxiv.org/abs/2408.00203](https://arxiv.org/abs/2408.00203)  
   *Details:* Screen parsing, interactable icon detection, Set-of-Marks visual grounding. (Accessed: 2026-08-16).
9. **macOS TCC (Transparency, Consent, and Control) Framework Mechanics**  
   *URL:* [https://developer.apple.com/documentation/security](https://developer.apple.com/documentation/security)  
   *Details:* `kTCCServiceAccessibility` and `kTCCServiceScreenCapture` security controls and authorization states. (Accessed: 2026-08-16).
