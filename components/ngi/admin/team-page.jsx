'use client';

import TeamManager from './team-manager';

// Admin → Team: add, edit, reorder, hide or remove members of Meet the Team.
export default function TeamPage() {
    return (
        <>
            <header className="cp-topbar">
                <div className="cp-topbar__brand">
                    <img
                        className="cp-topbar__logo"
                        src="/assets/images/ngi/project-images/torii-dark-text.svg"
                        alt="ToriiMinds"
                        width="500"
                        height="240"
                    />
                    <div className="cp-topbar__titles">
                        <h1 className="cp-topbar__title">Team</h1>
                        <p className="cp-topbar__sub">
                            Meet the Team on the website · add, edit and reorder members without a code change
                        </p>
                    </div>
                </div>
            </header>

            <TeamManager />
        </>
    );
}
