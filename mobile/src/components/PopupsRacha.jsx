/**
 * Popups globales de racha/ruleta — montados UNA sola vez en _layout.js
 * (equivalente al render final de App.jsx web). No van en AppShell: las
 * pantallas del Stack quedan montadas y se duplicarían los Modales.
 */
import { useStreak } from '../context/StreakContext';
import DailyStreakPopup from './DailyStreakPopup';
import WheelModal from './WheelModal';

export default function PopupsRacha() {
  const {
    puntosSaldo,
    showStreakPopup,
    streakData,
    showWheel,
    handleClaimDaily,
    handleOpenWheel,
    handleWheelSpin,
    handleCloseWheel,
    handleCloseStreakPopup,
  } = useStreak();

  return (
    <>
      {showStreakPopup && streakData && (
        <DailyStreakPopup
          racha={streakData.racha}
          saldo={puntosSaldo}
          yaReclamado={streakData.yaReclamado}
          onClaim={handleClaimDaily}
          onWheel={handleOpenWheel}
          onClose={handleCloseStreakPopup}
        />
      )}
      {showWheel && <WheelModal onSpin={handleWheelSpin} onClose={handleCloseWheel} />}
    </>
  );
}
