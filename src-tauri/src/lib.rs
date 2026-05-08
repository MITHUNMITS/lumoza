mod commands;
mod services;
mod setup;
mod state;
mod windows;

use state::app_state::AppState;

pub fn run() {
    tauri::Builder::default()
        .manage(AppState::default())
        .setup(|app| {
            setup::bootstrap::initialize(app.handle())?;
            windows::main_window::configure(app.handle())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::app::bootstrap_app,
            commands::project::list_projects,
            commands::project::create_project,
            commands::project::initialize_project_database,
            commands::scan::start_scan,
            commands::scan::pause_scan,
            commands::scan::resume_scan,
            commands::scan::cancel_scan,
            commands::system::get_system_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running lumoza studio");
}
