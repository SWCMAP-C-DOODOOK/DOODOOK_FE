type HeaderProps = {
    team: string;
    onBellClick?: () => void;
};

export default function Header({ team, onBellClick }: HeaderProps) {
    return (
        <header className="topbar">
            <div className="team">{team} ▾</div>
            <div
                className="bell"
                aria-label="notifications"
                role="button"
                onClick={onBellClick}
            >
                🔔
            </div>
        </header>
    );
}