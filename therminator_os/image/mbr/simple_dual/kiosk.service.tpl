[Unit]
Description=Kiosk Wayland Session
After=multi-user.target
Requires=graphical.target

[Service]
User=<KIOSK_USER>
WorkingDirectory=<KIOSK_RUNDIR>
Environment=XDG_RUNTIME_DIR=/run/user/1000
TTYPath=/dev/tty1
ExecStart=/usr/bin/cage -- <KIOSK_APP>
Restart=always
RestartSec=5s
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=graphical.target
