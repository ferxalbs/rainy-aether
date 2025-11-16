PS C:\Projects\rainy-aether-2\src-tauri> cargo check
    Checking rainy-aether v0.1.0 (C:\Projects\rainy-aether-2\src-tauri)
warning: variable does not need to be mutable
   --> src\agents\inference.rs:119:9
    |
119 |         mut callback: F,
    |         ----^^^^^^^^
    |         |
    |         help: remove this `mut`
    |
    = note: `#[warn(unused_mut)]` (part of `#[warn(unused)]`) on by default

warning: method `session_count` is never used
   --> src\agents\mod.rs:376:12
    |
103 | impl AgentManager {
    | ----------------- method in this implementation
...
376 |     pub fn session_count(&self) -> usize {
    |            ^^^^^^^^^^^^^
    |
    = note: `#[warn(dead_code)]` (part of `#[warn(unused)]`) on by default

warning: variants `NotInitialized`, `ToolExecutionFailed`, `MemoryLimitExceeded`, `RateLimitExceeded`, `InvalidConfiguration`, and `Other` are never constructed
  --> src\agents\core.rs:15:5
   |
13 | pub enum AgentError {
   |          ---------- variants in this enum
14 |     #[error("Agent not initialized")]
15 |     NotInitialized,
   |     ^^^^^^^^^^^^^^
...
18 |     ToolExecutionFailed(String),
   |     ^^^^^^^^^^^^^^^^^^^
...
24 |     MemoryLimitExceeded,
   |     ^^^^^^^^^^^^^^^^^^^
...
27 |     RateLimitExceeded,
   |     ^^^^^^^^^^^^^^^^^
...
33 |     InvalidConfiguration(String),
   |     ^^^^^^^^^^^^^^^^^^^^
...
42 |     Other(String),
   |     ^^^^^
   |
   = note: `AgentError` has a derived impl for the trait `Debug`, but this is intentionally ignored during dead code analysis

warning: trait `Agent` is never used
  --> src\agents\core.rs:47:11
   |
47 | pub trait Agent: Send + Sync {
   |           ^^^^^

warning: enum `Capability` is never used
   --> src\agents\core.rs:195:10
    |
195 | pub enum Capability {
    |          ^^^^^^^^^^

warning: methods `get_or_create`, `get_recent`, `prune_messages`, `get_active_sessions`, and `total_memory_usage` are never used
   --> src\agents\memory.rs:40:12
    |
 24 | impl MemoryManager {
    | ------------------ methods in this implementation
...
 40 |     pub fn get_or_create(&self, session_id: &str) -> ConversationMemory {
    |            ^^^^^^^^^^^^^
...
 91 |     pub fn get_recent(&self, session_id: &str, count: usize) -> Vec<Message> {
    |            ^^^^^^^^^^
...
106 |     pub fn prune_messages(&self, session_id: &str) {
    |            ^^^^^^^^^^^^^^
...
168 |     pub fn get_active_sessions(&self) -> Vec<String> {
    |            ^^^^^^^^^^^^^^^^^^^
...
173 |     pub fn total_memory_usage(&self) -> MemoryUsage {
    |            ^^^^^^^^^^^^^^^^^^

warning: methods `add_message` and `as_slice` are never used
   --> src\agents\memory.rs:235:12
    |
220 | impl ConversationMemory {
    | ----------------------- methods in this implementation
...
235 |     pub fn add_message(&mut self, message: Message) {
    |            ^^^^^^^^^^^
...
242 |     pub fn as_slice(&self) -> Vec<Message> {
    |            ^^^^^^^^

warning: associated function `system` is never used
   --> src\agents\memory.rs:286:12
    |
271 | impl Message {
    | ------------ associated function in this implementation
...
286 |     pub fn system(content: String) -> Self {
    |            ^^^^^^

warning: struct `MemoryUsage` is never constructed
   --> src\agents\memory.rs:345:12
    |
345 | pub struct MemoryUsage {
    |            ^^^^^^^^^^^

warning: methods `record_tool_execution`, `record_provider_call`, `get_tool_metrics`, `get_provider_metrics`, and `reset` are never used
   --> src\agents\metrics.rs:75:12
    |
 27 | impl MetricsCollector {
    | --------------------- methods in this implementation
...
 75 |     pub fn record_tool_execution(
    |            ^^^^^^^^^^^^^^^^^^^^^
...
100 |     pub fn record_provider_call(
    |            ^^^^^^^^^^^^^^^^^^^^
...
132 |     pub fn get_tool_metrics(&self, tool_name: &str) -> Option<ToolMetrics> {
    |            ^^^^^^^^^^^^^^^^
...
137 |     pub fn get_provider_metrics(&self, provider: &str) -> Option<ProviderMetrics> {
    |            ^^^^^^^^^^^^^^^^^^^^
...
166 |     pub fn reset(&self) {
    |            ^^^^^

warning: methods `avg_latency_ms`, `success_rate`, `avg_tokens_per_request`, and `avg_cost_per_request` are never used
   --> src\agents\metrics.rs:211:12
    |
209 | impl AgentMetrics {
    | ----------------- methods in this implementation
210 |     /// Calculate average latency
211 |     pub fn avg_latency_ms(&self) -> f64 {
    |            ^^^^^^^^^^^^^^
...
220 |     pub fn success_rate(&self) -> f64 {
    |            ^^^^^^^^^^^^
...
229 |     pub fn avg_tokens_per_request(&self) -> f64 {
    |            ^^^^^^^^^^^^^^^^^^^^^^
...
238 |     pub fn avg_cost_per_request(&self) -> f64 {
    |            ^^^^^^^^^^^^^^^^^^^^

warning: methods `avg_duration_ms` and `success_rate` are never used
   --> src\agents\metrics.rs:272:12
    |
270 | impl ToolMetrics {
    | ---------------- methods in this implementation
271 |     /// Calculate average execution time
272 |     pub fn avg_duration_ms(&self) -> f64 {
    |            ^^^^^^^^^^^^^^^
...
281 |     pub fn success_rate(&self) -> f64 {
    |            ^^^^^^^^^^^^

warning: methods `avg_latency_ms` and `success_rate` are never used
   --> src\agents\metrics.rs:314:12
    |
312 | impl ProviderMetrics {
    | -------------------- methods in this implementation
313 |     /// Calculate average latency
314 |     pub fn avg_latency_ms(&self) -> f64 {
    |            ^^^^^^^^^^^^^^
...
323 |     pub fn success_rate(&self) -> f64 {
    |            ^^^^^^^^^^^^

warning: field `start_time` is never read
   --> src\agents\metrics.rs:346:9
    |
334 | pub struct SystemMetrics {
    |            ------------- field in this struct
...
346 |     pub start_time: Option<Instant>,
    |         ^^^^^^^^^^
    |
    = note: `SystemMetrics` has derived impls for the traits `Clone` and `Debug`, but these are intentionally ignored during dead code analysis

warning: method `uptime` is never used
   --> src\agents\metrics.rs:351:12
    |
349 | impl SystemMetrics {
    | ------------------ method in this implementation
350 |     /// Get system uptime
351 |     pub fn uptime(&self) -> Duration {
    |            ^^^^^^

warning: enum `RateLimitError` is never used
  --> src\agents\rate_limiter.rs:13:10
   |
13 | pub enum RateLimitError {
   |          ^^^^^^^^^^^^^^

warning: fields `state`, `max_tokens`, `refill_rate`, and `refill_interval` are never read
  --> src\agents\rate_limiter.rs:26:5
   |
25 | pub struct RateLimiter {
   |            ----------- fields in this struct
26 |     state: Arc<Mutex<RateLimiterState>>,
   |     ^^^^^
27 |     max_tokens: u32,
   |     ^^^^^^^^^^
28 |     refill_rate: u32,
   |     ^^^^^^^^^^^
29 |     refill_interval: Duration,
   |     ^^^^^^^^^^^^^^^

warning: fields `tokens` and `last_refill` are never read
  --> src\agents\rate_limiter.rs:33:5
   |
32 | struct RateLimiterState {
   |        ---------------- fields in this struct
33 |     tokens: u32,
   |     ^^^^^^
34 |     last_refill: Instant,
   |     ^^^^^^^^^^^

warning: multiple associated items are never used
   --> src\agents\rate_limiter.rs:52:12
    |
 37 | impl RateLimiter {
    | ---------------- associated items in this implementation
...
 52 |     pub fn new(max_tokens: u32, refill_rate: u32, refill_interval: Duration) -> Self {
    |            ^^^
...
 65 |     pub fn for_provider(provider: &str) -> Self {
    |            ^^^^^^^^^^^^
...
 85 |     pub fn try_acquire(&self) -> Result<(), RateLimitError> {
    |            ^^^^^^^^^^^
...
105 |     pub async fn acquire(&self) -> Result<(), RateLimitError> {
    |                  ^^^^^^^
...
127 |     fn refill_tokens(&self, state: &mut RateLimiterState) {
    |        ^^^^^^^^^^^^^
...
142 |     pub fn available_tokens(&self) -> u32 {
    |            ^^^^^^^^^^^^^^^^
...
149 |     pub fn stats(&self) -> RateLimiterStats {
    |            ^^^^^

warning: struct `RateLimiterStats` is never constructed
   --> src\agents\rate_limiter.rs:162:12
    |
162 | pub struct RateLimiterStats {
    |            ^^^^^^^^^^^^^^^^

warning: enum `InferenceError` is never used
  --> src\agents\inference.rs:16:10
   |
16 | pub enum InferenceError {
   |          ^^^^^^^^^^^^^^

warning: enum `Provider` is never used
  --> src\agents\inference.rs:39:10
   |
39 | pub enum Provider {
   |          ^^^^^^^^

warning: fields `client`, `rate_limiter`, and `timeout` are never read
  --> src\agents\inference.rs:47:5
   |
45 | pub struct InferenceEngine {
   |            --------------- fields in this struct
46 |     /// HTTP client for API requests
47 |     client: Client,
   |     ^^^^^^
...
50 |     rate_limiter: Arc<RateLimiter>,
   |     ^^^^^^^^^^^^
...
53 |     timeout: Duration,
   |     ^^^^^^^

warning: multiple associated items are never used
   --> src\agents\inference.rs:58:12
    |
 56 | impl InferenceEngine {
    | -------------------- associated items in this implementation
 57 |     /// Create a new inference engine
 58 |     pub fn new(provider: Provider) -> Self {
    |            ^^^
...
 75 |     pub async fn infer(
    |                  ^^^^^
...
111 |     pub async fn stream_infer<F>(
    |                  ^^^^^^^^^^^^
...
139 |     async fn infer_google(
    |              ^^^^^^^^^^^^
...
185 |     async fn stream_google<F>(
    |              ^^^^^^^^^^^^^
...
267 |     async fn infer_groq(
    |              ^^^^^^^^^^
...
319 |     async fn stream_groq<F>(
    |              ^^^^^^^^^^^

warning: struct `InferenceConfig` is never constructed
   --> src\agents\inference.rs:411:12
    |
411 | pub struct InferenceConfig {
    |            ^^^^^^^^^^^^^^^

warning: struct `InferenceMessage` is never constructed
   --> src\agents\inference.rs:431:12
    |
431 | pub struct InferenceMessage {
    |            ^^^^^^^^^^^^^^^^

warning: struct `ToolDefinition` is never constructed
   --> src\agents\inference.rs:438:12
    |
438 | pub struct ToolDefinition {
    |            ^^^^^^^^^^^^^^

warning: struct `InferenceResponse` is never constructed
   --> src\agents\inference.rs:446:12
    |
446 | pub struct InferenceResponse {
    |            ^^^^^^^^^^^^^^^^^

warning: enum `FinishReason` is never used
   --> src\agents\inference.rs:456:10
    |
456 | pub enum FinishReason {
    |          ^^^^^^^^^^^^

warning: struct `TokenUsage` is never constructed
   --> src\agents\inference.rs:466:12
    |
466 | pub struct TokenUsage {
    |            ^^^^^^^^^^

warning: struct `StreamChunk` is never constructed
   --> src\agents\inference.rs:474:12
    |
474 | pub struct StreamChunk {
    |            ^^^^^^^^^^^

warning: struct `GoogleRequest` is never constructed
   --> src\agents\inference.rs:485:8
    |
485 | struct GoogleRequest {
    |        ^^^^^^^^^^^^^

warning: struct `GoogleContent` is never constructed
   --> src\agents\inference.rs:494:8
    |
494 | struct GoogleContent {
    |        ^^^^^^^^^^^^^

warning: struct `GooglePart` is never constructed
   --> src\agents\inference.rs:500:8
    |
500 | struct GooglePart {
    |        ^^^^^^^^^^

warning: struct `GoogleTools` is never constructed
   --> src\agents\inference.rs:506:8
    |
506 | struct GoogleTools {
    |        ^^^^^^^^^^^

warning: struct `GoogleFunctionDeclaration` is never constructed
   --> src\agents\inference.rs:511:8
    |
511 | struct GoogleFunctionDeclaration {
    |        ^^^^^^^^^^^^^^^^^^^^^^^^^

warning: struct `GoogleGenerationConfig` is never constructed
   --> src\agents\inference.rs:518:8
    |
518 | struct GoogleGenerationConfig {
    |        ^^^^^^^^^^^^^^^^^^^^^^

warning: struct `GoogleResponse` is never constructed
   --> src\agents\inference.rs:530:8
    |
530 | struct GoogleResponse {
    |        ^^^^^^^^^^^^^^

warning: struct `GoogleCandidate` is never constructed
   --> src\agents\inference.rs:537:8
    |
537 | struct GoogleCandidate {
    |        ^^^^^^^^^^^^^^^

warning: struct `GoogleUsageMetadata` is never constructed
   --> src\agents\inference.rs:543:8
    |
543 | struct GoogleUsageMetadata {
    |        ^^^^^^^^^^^^^^^^^^^

warning: struct `GroqRequest` is never constructed
   --> src\agents\inference.rs:554:8
    |
554 | struct GroqRequest {
    |        ^^^^^^^^^^^

warning: struct `GroqMessage` is never constructed
   --> src\agents\inference.rs:568:8
    |
568 | struct GroqMessage {
    |        ^^^^^^^^^^^

warning: struct `GroqTool` is never constructed
   --> src\agents\inference.rs:574:8
    |
574 | struct GroqTool {
    |        ^^^^^^^^

warning: struct `GroqFunction` is never constructed
   --> src\agents\inference.rs:580:8
    |
580 | struct GroqFunction {
    |        ^^^^^^^^^^^^

warning: struct `GroqResponse` is never constructed
   --> src\agents\inference.rs:587:8
    |
587 | struct GroqResponse {
    |        ^^^^^^^^^^^^

warning: struct `GroqChoice` is never constructed
   --> src\agents\inference.rs:593:8
    |
593 | struct GroqChoice {
    |        ^^^^^^^^^^

warning: struct `GroqUsage` is never constructed
   --> src\agents\inference.rs:599:8
    |
599 | struct GroqUsage {
    |        ^^^^^^^^^

warning: struct `GroqStreamChunk` is never constructed
   --> src\agents\inference.rs:606:8
    |
606 | struct GroqStreamChunk {
    |        ^^^^^^^^^^^^^^^

warning: struct `GroqStreamChoice` is never constructed
   --> src\agents\inference.rs:611:8
    |
611 | struct GroqStreamChoice {
    |        ^^^^^^^^^^^^^^^^

warning: struct `GroqDelta` is never constructed
   --> src\agents\inference.rs:616:8
    |
616 | struct GroqDelta {
    |        ^^^^^^^^^

warning: variant `InvalidArguments` is never constructed
  --> src\agents\executor.rs:21:5
   |
16 | pub enum ToolError {
   |          --------- variant in this enum
...
21 |     InvalidArguments(String),
   |     ^^^^^^^^^^^^^^^^
   |
   = note: `ToolError` has a derived impl for the trait `Debug`, but this is intentionally ignored during dead code analysis

warning: methods `register_tool`, `execute_parallel`, `get_tool_definition`, `clear_cache`, and `stats` are never used
   --> src\agents\executor.rs:70:12
    |
 57 | impl ToolExecutor {
    | ----------------- methods in this implementation
...
 70 |     pub fn register_tool(&self, tool: Arc<dyn Tool>) {
    |            ^^^^^^^^^^^^^
...
137 |     pub async fn execute_parallel(
    |                  ^^^^^^^^^^^^^^^^
...
167 |     pub fn get_tool_definition(&self, name: &str) -> Option<ToolDefinition> {
    |            ^^^^^^^^^^^^^^^^^^^
...
172 |     pub fn clear_cache(&self) {
    |            ^^^^^^^^^^^
...
178 |     pub fn stats(&self) -> ExecutorStats {
    |            ^^^^^

warning: methods `register`, `get_definition`, `count`, and `get_metrics` are never used
   --> src\agents\executor.rs:257:12
    |
247 | impl ToolRegistry {
    | ----------------- methods in this implementation
...
257 |     pub fn register(&self, tool: Arc<dyn Tool>) {
    |            ^^^^^^^^
...
286 |     pub fn get_definition(&self, name: &str) -> Option<ToolDefinition> {
    |            ^^^^^^^^^^^^^^
...
300 |     pub fn count(&self) -> usize {
    |            ^^^^^
...
324 |     pub fn get_metrics(&self, tool_name: &str) -> Option<ToolMetrics> {
    |            ^^^^^^^^^^^

warning: struct `ExecutorStats` is never constructed
   --> src\agents\executor.rs:361:12
    |
361 | pub struct ExecutorStats {
    |            ^^^^^^^^^^^^^

warning: variants `InvalidResponse`, `RateLimitExceeded`, `AuthenticationFailed`, `Timeout`, and `UnsupportedFeature` are never constructed
  --> src\agents\providers\base.rs:16:5
   |
11 | pub enum ProviderError {
   |          ------------- variants in this enum
...
16 |     InvalidResponse(String),
   |     ^^^^^^^^^^^^^^^
...
25 |     RateLimitExceeded,
   |     ^^^^^^^^^^^^^^^^^
...
28 |     AuthenticationFailed(String),
   |     ^^^^^^^^^^^^^^^^^^^^
...
34 |     Timeout,
   |     ^^^^^^^
...
37 |     UnsupportedFeature(String),
   |     ^^^^^^^^^^^^^^^^^^
   |
   = note: `ProviderError` has a derived impl for the trait `Debug`, but this is intentionally ignored during dead code analysis

warning: methods `id`, `name`, `stream`, `supports_feature`, and `list_models` are never used
  --> src\agents\providers\base.rs:44:8
   |
42 | pub trait ModelProvider: Send + Sync {
   |           ------------- methods in this trait
43 |     /// Get provider identifier
44 |     fn id(&self) -> &str;
   |        ^^
...
47 |     fn name(&self) -> &str;
   |        ^^^^
...
56 |     async fn stream<F>(
   |              ^^^^^^
...
65 |     fn supports_feature(&self, feature: ProviderFeature) -> bool;
   |        ^^^^^^^^^^^^^^^^
...
68 |     async fn list_models(&self) -> Result<Vec<ModelInfo>, ProviderError>;
   |              ^^^^^^^^^^^

warning: struct `StreamChunk` is never constructed
   --> src\agents\providers\base.rs:239:12
    |
239 | pub struct StreamChunk {
    |            ^^^^^^^^^^^

warning: enum `ProviderFeature` is never used
   --> src\agents\providers\base.rs:255:10
    |
255 | pub enum ProviderFeature {
    |          ^^^^^^^^^^^^^^^

warning: struct `ModelInfo` is never constructed
   --> src\agents\providers\base.rs:274:12
    |
274 | pub struct ModelInfo {
    |            ^^^^^^^^^

warning: struct `GoogleProvider` is never constructed
 --> src\agents\providers\google.rs:8:12
  |
8 | pub struct GoogleProvider {
  |            ^^^^^^^^^^^^^^

warning: associated items `new` and `with_base_url` are never used
  --> src\agents\providers\google.rs:16:12
   |
14 | impl GoogleProvider {
   | ------------------- associated items in this implementation
15 |     /// Create a new Google provider
16 |     pub fn new(api_key: String) -> Self {
   |            ^^^
...
25 |     pub fn with_base_url(mut self, base_url: String) -> Self {
   |            ^^^^^^^^^^^^^

warning: method `with_base_url` is never used
  --> src\agents\providers\groq.rs:27:12
   |
16 | impl GroqProvider {
   | ----------------- method in this implementation
...
27 |     pub fn with_base_url(mut self, base_url: String) -> Self {
   |            ^^^^^^^^^^^^^

warning: struct `ToolRegistry` is never constructed
  --> src\agents\tools\registry.rs:13:12
   |
13 | pub struct ToolRegistry {
   |            ^^^^^^^^^^^^

warning: struct `ToolMetrics` is never constructed
  --> src\agents\tools\registry.rs:23:12
   |
23 | pub struct ToolMetrics {
   |            ^^^^^^^^^^^

warning: multiple associated items are never used
   --> src\agents\tools\registry.rs:33:12
    |
 31 | impl ToolRegistry {
    | ----------------- associated items in this implementation
 32 |     /// Create a new tool registry
 33 |     pub fn new() -> Self {
    |            ^^^
...
 46 |     fn register_default_tools(&self) {
    |        ^^^^^^^^^^^^^^^^^^^^^^
...
 58 |     pub fn register(&self, tool: Arc<dyn Tool>) {
    |            ^^^^^^^^
...
 66 |     pub fn get(&self, name: &str) -> Option<Arc<dyn Tool>> {
    |            ^^^
...
 71 |     pub fn list_tools(&self) -> Vec<ToolDefinition> {
    |            ^^^^^^^^^^
...
 86 |     pub fn get_definition(&self, name: &str) -> Option<ToolDefinition> {
    |            ^^^^^^^^^^^^^^
...
 97 |     pub fn count(&self) -> usize {
    |            ^^^^^
...
102 |     pub fn has(&self, name: &str) -> bool {
    |            ^^^
...
107 |     pub fn record_execution(&self, name: &str, duration: Duration, success: bool) {
    |            ^^^^^^^^^^^^^^^^
...
126 |     pub fn get_metrics(&self, name: &str) -> Option<ToolMetrics> {
    |            ^^^^^^^^^^^
...
131 |     pub fn get_all_metrics(&self) -> HashMap<String, ToolMetrics> {
    |            ^^^^^^^^^^^^^^^

warning: struct `ReadFileTool` is never constructed
  --> src\agents\tools\filesystem.rs:11:12
   |
11 | pub struct ReadFileTool;
   |            ^^^^^^^^^^^^

warning: struct `ReadFileArgs` is never constructed
  --> src\agents\tools\filesystem.rs:61:8
   |
61 | struct ReadFileArgs {
   |        ^^^^^^^^^^^^

warning: struct `WriteFileTool` is never constructed
  --> src\agents\tools\filesystem.rs:66:12
   |
66 | pub struct WriteFileTool;
   |            ^^^^^^^^^^^^^

warning: struct `WriteFileArgs` is never constructed
   --> src\agents\tools\filesystem.rs:116:8
    |
116 | struct WriteFileArgs {
    |        ^^^^^^^^^^^^^

warning: struct `ListDirectoryTool` is never constructed
   --> src\agents\tools\filesystem.rs:122:12
    |
122 | pub struct ListDirectoryTool;
    |            ^^^^^^^^^^^^^^^^^

warning: struct `ListDirectoryArgs` is never constructed
   --> src\agents\tools\filesystem.rs:182:8
    |
182 | struct ListDirectoryArgs {
    |        ^^^^^^^^^^^^^^^^^

warning: struct `ExecuteCommandTool` is never constructed
  --> src\agents\tools\terminal.rs:12:12
   |
12 | pub struct ExecuteCommandTool;
   |            ^^^^^^^^^^^^^^^^^^

warning: struct `ExecuteCommandArgs` is never constructed
  --> src\agents\tools\terminal.rs:78:8
   |
78 | struct ExecuteCommandArgs {
   |        ^^^^^^^^^^^^^^^^^^

warning: struct `GitStatusTool` is never constructed
  --> src\agents\tools\git.rs:11:12
   |
11 | pub struct GitStatusTool;
   |            ^^^^^^^^^^^^^

warning: struct `GitStatusArgs` is never constructed
  --> src\agents\tools\git.rs:80:8
   |
80 | struct GitStatusArgs {
   |        ^^^^^^^^^^^^^

warning: struct `GitLogTool` is never constructed
  --> src\agents\tools\git.rs:85:12
   |
85 | pub struct GitLogTool;
   |            ^^^^^^^^^^

warning: struct `GitLogArgs` is never constructed
   --> src\agents\tools\git.rs:161:8
    |
161 | struct GitLogArgs {
    |        ^^^^^^^^^^

warning: struct `WorkspaceStructureTool` is never constructed
  --> src\agents\tools\workspace.rs:12:12
   |
12 | pub struct WorkspaceStructureTool;
   |            ^^^^^^^^^^^^^^^^^^^^^^

warning: struct `WorkspaceStructureArgs` is never constructed
  --> src\agents\tools\workspace.rs:92:8
   |
92 | struct WorkspaceStructureArgs {
   |        ^^^^^^^^^^^^^^^^^^^^^^

warning: struct `SearchFilesTool` is never constructed
  --> src\agents\tools\workspace.rs:98:12
   |
98 | pub struct SearchFilesTool;
   |            ^^^^^^^^^^^^^^^

warning: struct `SearchFilesArgs` is never constructed
   --> src\agents\tools\workspace.rs:173:8
    |
173 | struct SearchFilesArgs {
    |        ^^^^^^^^^^^^^^^

warning: struct `ConfigurationContribution` is never constructed
  --> src\configuration_manager.rs:97:12
   |
97 | pub struct ConfigurationContribution {
   |            ^^^^^^^^^^^^^^^^^^^^^^^^^

warning: struct `ResolvedConfiguration` is never constructed
   --> src\configuration_manager.rs:107:12
    |
107 | pub struct ResolvedConfiguration {
    |            ^^^^^^^^^^^^^^^^^^^^^

warning: struct `ProviderCredential` is never constructed
 --> src\credential_manager.rs:6:12
  |
6 | pub struct ProviderCredential {
  |            ^^^^^^^^^^^^^^^^^^

warning: associated function `update_credential` is never used
   --> src\credential_manager.rs:119:12
    |
 19 | impl CredentialManager {
    | ---------------------- associated function in this implementation
...
119 |     pub fn update_credential(provider_id: &str, api_key: &str) -> Result<(), String> {
    |            ^^^^^^^^^^^^^^^^^

warning: methods `get_extension`, `get_extension_mut`, `update_extension`, `list_extensions`, and `list_enabled_extensions` are never used
  --> src\extension_registry.rs:50:12
   |
28 | impl ExtensionRegistry {
   | ---------------------- methods in this implementation
...
50 |     pub fn get_extension(&self, id: &str) -> Option<&ExtensionRegistryEntry> {
   |            ^^^^^^^^^^^^^
...
54 |     pub fn get_extension_mut(&mut self, id: &str) -> Option<&mut ExtensionRegistryEntry> {
   |            ^^^^^^^^^^^^^^^^^
...
58 |     pub fn update_extension(&mut self, id: &str, entry: ExtensionRegistryEntry) -> bool {
   |            ^^^^^^^^^^^^^^^^
...
88 |     pub fn list_extensions(&self) -> Vec<&ExtensionRegistryEntry> {
   |            ^^^^^^^^^^^^^^^
...
92 |     pub fn list_enabled_extensions(&self) -> Vec<&ExtensionRegistryEntry> {
   |            ^^^^^^^^^^^^^^^^^^^^^^^

warning: struct `FileSearchResult` is never constructed
  --> src\file_operations.rs:31:12
   |
31 | pub struct FileSearchResult {
   |            ^^^^^^^^^^^^^^^^

warning: struct `CloneProgress` is never constructed
   --> src\git_manager.rs:496:12
    |
496 | pub struct CloneProgress {
    |            ^^^^^^^^^^^^^

warning: associated items `all_native`, `all_cli`, `enable_operation`, `disable_operation`, and `should_use_native` are never used
   --> src\git_config.rs:63:12
    |
 61 | impl GitConfig {
    | -------------- associated items in this implementation
 62 |     /// Create a new GitConfig with all native operations enabled
 63 |     pub fn all_native() -> Self {
    |            ^^^^^^^^^^
...
 79 |     pub fn all_cli() -> Self {
    |            ^^^^^^^
...
 95 |     pub fn enable_operation(&mut self, operation: &str) {
    |            ^^^^^^^^^^^^^^^^
...
109 |     pub fn disable_operation(&mut self, operation: &str) {
    |            ^^^^^^^^^^^^^^^^^
...
123 |     pub fn should_use_native(&self, operation: &str) -> bool {
    |            ^^^^^^^^^^^^^^^^^

warning: struct `AuthCallbacks` is never constructed
  --> src\git_auth.rs:14:12
   |
14 | pub struct AuthCallbacks;
   |            ^^^^^^^^^^^^^

warning: associated functions `create_callbacks`, `fetch_options`, `push_options`, and `create_callbacks_with_progress` are never used
   --> src\git_auth.rs:24:12
    |
 16 | impl AuthCallbacks {
    | ------------------ associated functions in this implementation
...
 24 |     pub fn create_callbacks<'a>() -> RemoteCallbacks<'a> {
    |            ^^^^^^^^^^^^^^^^
...
118 |     pub fn fetch_options<'a>() -> FetchOptions<'a> {
    |            ^^^^^^^^^^^^^
...
125 |     pub fn push_options<'a>() -> PushOptions<'a> {
    |            ^^^^^^^^^^^^
...
132 |     pub fn create_callbacks_with_progress<F>(mut on_progress: F) -> RemoteCallbacks<'static>
    |            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

warning: field `server_id` is never read
  --> src\language_server_manager.rs:20:5
   |
16 | struct LanguageServerProcess {
   |        --------------------- field in this struct
...
20 |     server_id: String,
   |     ^^^^^^^^^
   |
   = note: `LanguageServerProcess` has a derived impl for the trait `Debug`, but this is intentionally ignored during dead code analysis

warning: method `stop_all_servers` is never used
   --> src\language_server_manager.rs:276:12
    |
 54 | impl LanguageServerManager {
    | -------------------------- method in this implementation
...
276 |     pub fn stop_all_servers(&self) {
    |            ^^^^^^^^^^^^^^^^

warning: `rainy-aether` (lib) generated 93 warnings (run `cargo fix --lib -p rainy-aether` to apply 1 suggestion)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 12.14s
PS C:\Projects\rainy-aether-2\src-tauri> 