'use client';

interface HealthBarsProps {
    myHp: number;
    opponentHp: number;
    myName: string;
    opponentName: string;
}

export function HealthBars({ myHp: my_hp, opponentHp: opponent_hp, myName: my_name, opponentName: opponent_name }: HealthBarsProps) {
    function renderPlayer(name: string, hp: number, opponent = false) {
        const health = Math.max(0, Math.min(100, hp));
        return (
            <div className={'health-player' + (opponent ? ' opponent' : '')}>
                <div className="health-label"><strong>{name} {opponent ? '' : '(you)'}</strong><span>{Math.round(health)} / 100 HP</span></div>
                <div className="health-track" role="progressbar" aria-label={name + ' health'} aria-valuenow={Math.round(health)} aria-valuemin={0} aria-valuemax={100}>
                    <div className="health-fill" style={{ width: health + '%' }} />
                </div>
            </div>
        );
    }
    return <div className="health-hud">{renderPlayer(my_name, my_hp)}<span className="hud-vs">VS</span>{renderPlayer(opponent_name, opponent_hp, true)}</div>;
}
