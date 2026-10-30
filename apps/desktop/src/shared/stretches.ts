import { StretchExercise, ReminderType, ExerciseVariation } from './types';

export const STRETCH_CATALOG: StretchExercise[] = [
  {
    id: 'eye-202020',
    title: '20-20-20 Eye Break',
    category: 'eye',
    targetArea: 'Eye Ciliary Muscles & Retinal Rest',
    durationSeconds: 20,
    description: 'Look away from your screen at an object at least 20 feet (6 meters) away for 20 seconds.',
    steps: [
      'Shift your gaze smoothly away from your monitor.',
      'Find an object in the distance—a window view, far wall, or distant plant.',
      'Blink naturally and slowly 3 to 4 times to re-hydrate the cornea.',
      'Allow your eyes to soften their focus and completely relax.',
    ],
    benefits: 'Relieves digital eye strain (asthenopia), relaxes accommodating muscles, and prevents dryness and headaches.',
    illustrationKey: 'eye-distance',
  },
  {
    id: 'eye-palming',
    title: 'Warm Eye Palming',
    category: 'eye',
    targetArea: 'Ocular Nerves & Optical Rest',
    durationSeconds: 30,
    description: 'Cup your warmed palms gently over closed eyes to immerse them in soothing darkness.',
    steps: [
      'Rub your palms together vigorously for 10 seconds until warm.',
      'Close your eyes softly without clenching the eyelids.',
      'Cup your palms gently over your eye sockets without applying pressure to the eyeballs.',
      'Inhale deeply and enjoy 20 seconds of calming darkness and radiant warmth.',
    ],
    benefits: 'Calms optical nerves, reduces photoreceptor fatigue, and induces deep mental relaxation.',
    illustrationKey: 'eye-palming',
  },
  {
    id: 'posture-neck-relief',
    title: 'Gentle Neck & Cervical Relief',
    category: 'posture',
    targetArea: 'Upper Trapezius & Cervical Spine',
    durationSeconds: 45,
    description: 'Slow, controlled lateral neck tilts and chin retractions to counteract "tech neck".',
    steps: [
      'Sit or stand upright with your spine long and shoulders relaxed.',
      'Slowly tilt your right ear toward your right shoulder without lifting the shoulder. Hold for 15s.',
      'Return to center, then gently tilt your left ear toward your left shoulder. Hold for 15s.',
      'Perform 3 gentle chin tucks (retracting the chin horizontally like making a double chin) for 5s each.',
    ],
    benefits: 'Reduces cervical spine compression, alleviates neck stiffness, and improves blood flow to the head.',
    illustrationKey: 'neck-tilt',
  },
  {
    id: 'posture-shoulder-rolls',
    title: 'Shoulder Rolls & Chest Opener',
    category: 'posture',
    targetArea: 'Deltoids, Rhomboids & Pectorals',
    durationSeconds: 45,
    description: 'Roll shoulders in wide circular motions to undo slumped desk posture and open up the chest.',
    steps: [
      'Inhale and lift your shoulders up toward your ears.',
      'Roll them backward, drawing your shoulder blades together in a smooth arc.',
      'Lower them down and forward as you exhale. Repeat for 5 backward circles.',
      'Interlace fingers behind your lower back and gently straighten arms to open the chest for 15s.',
    ],
    benefits: 'Reverses forward-slumping posture, loosens tight rhomboids, and expands lung capacity.',
    illustrationKey: 'shoulder-roll',
  },
  {
    id: 'stretch-wrist-relief',
    title: 'Wrist & Forearm Decompression',
    category: 'stretch',
    targetArea: 'Carpal Tunnel, Wrist Flexors & Extensors',
    durationSeconds: 40,
    description: 'Counteract repetitive mouse clicking and keyboard typing strain.',
    steps: [
      'Extend your right arm forward with palm facing forward, fingers pointing upward.',
      'With your left hand, gently pull back on the right fingers until a comfortable forearm stretch is felt. Hold 15s.',
      'Point the right fingers downward and apply gentle pressure on the back of the hand for 15s.',
      'Shake both wrists out lightly and rotate wrists in circles 5 times each direction.',
    ],
    benefits: 'Decreases median nerve pressure, guards against repetitive strain injuries (RSI), and prevents tendonitis.',
    illustrationKey: 'wrist-stretch',
  },
  {
    id: 'stretch-seated-twist',
    title: 'Seated Spinal Twist & Cat-Cow',
    category: 'stretch',
    targetArea: 'Thoracic & Lumbar Spine',
    durationSeconds: 50,
    description: 'Gentle rotational and sagittal movement to nourish spinal discs and relieve lower back tightness.',
    steps: [
      'Sit tall with feet flat on the floor.',
      'Place your right hand on the left knee, left hand on the chair back or armrest.',
      'Gently rotate your torso to the left from the thoracic spine, gazing over the left shoulder. Hold 20s.',
      'Slowly untwist and repeat to the right side for 20s.',
      'Conclude with 2 deep breaths, arching and rounding your spine softly.',
    ],
    benefits: 'Hydrates vertebral discs, alleviates lower back pressure from sitting, and improves mobility.',
    illustrationKey: 'spine-twist',
  },
  {
    id: 'move-stand-reset',
    title: 'Stand Up & Posture Reset',
    category: 'movement',
    targetArea: 'Hip Flexors, Glutes & Circulation',
    durationSeconds: 60,
    description: 'Break static sitting posture, activate major leg muscles, and re-align whole-body balance.',
    steps: [
      'Push your chair back and rise to a full standing posture.',
      'Place hands on your hips, step one foot back slightly, and gently press hips forward to open hip flexors (20s each leg).',
      'Raise both arms overhead, reach tall toward the ceiling, and take 3 deep diaphragmatic breaths.',
      'Lower arms and shake out legs and arms.',
    ],
    benefits: 'Re-activates inhibited gluteal muscles, restores metabolic rate, and reduces venous pooling in lower limbs.',
    illustrationKey: 'stand-reset',
  },
  {
    id: 'move-walking-break',
    title: 'Active Walking & Refresh Break',
    category: 'movement',
    targetArea: 'Cardiovascular, Lymphatic & Systemic Energy',
    durationSeconds: 180,
    description: 'A 2 to 5 minute walking stroll away from the desk to boost blood circulation and cognitive focus.',
    steps: [
      'Step completely away from your workstation and digital screens.',
      'Walk at a steady, relaxed pace down a corridor, stairs, or around your workspace.',
      'Keep your eyes focused across room-length distances to promote peripheral visual stimulus.',
      'Drink a glass of water to maintain hydration and cellular recovery.',
    ],
    benefits: 'Boosts cerebral blood flow, burns static fatigue, lowers insulin response, and restores creative clarity.',
    illustrationKey: 'walking-break',
  },
];

/**
 * Curated library of 2-3 distinct exercise variations per reminder category.
 * Each variation contains tailored copy, 20-20-20 rule adherence where applicable,
 * and a distinct illustration key for dedicated animation rendering.
 */
export const EXERCISE_VARIATIONS: Record<ReminderType, ExerciseVariation[]> = {
  'eye-break': [
    {
      id: 'eye-window',
      type: 'eye-break',
      title: '20-20-20 Window View',
      categoryLabel: 'Eye Break',
      firstWord: 'Eye',
      highlightWord: 'Break',
      subtitle: 'Look out the window at a distant point (6m / 20ft away) for 20 seconds.',
      instruction: 'Look at a distant object through a window for 20 seconds.',
      illustrationKey: 'eye-window',
      durationSeconds: 20,
      description: 'Look through a window at an object at least 20 feet (6 meters) away for 20 seconds to relax ciliary eye muscles.',
    },
    {
      id: 'eye-room',
      type: 'eye-break',
      title: 'Room Distance Focus',
      categoryLabel: 'Eye Break',
      firstWord: 'Room',
      highlightWord: 'Focus',
      subtitle: 'Focus your gaze across the room at a wall clock, art, or distant corner.',
      instruction: 'Focus on a distant object elsewhere in the room for 20 seconds.',
      illustrationKey: 'eye-room',
      durationSeconds: 20,
      description: 'Shift focus smoothly away from close monitors to the farthest corner or wall of the room.',
    },
    {
      id: 'eye-relax',
      type: 'eye-break',
      title: 'Soft Gaze & Eye Rest',
      categoryLabel: 'Eye Break',
      firstWord: 'Eye',
      highlightWord: 'Rest',
      subtitle: 'Look away from the monitor, blink softly, and allow eye muscles to unwind.',
      instruction: 'Relax the eyes by looking away from the monitor and blinking gently.',
      illustrationKey: 'eye-relax',
      durationSeconds: 20,
      description: 'Release accommodative micro-spasms and lubricate cornea surfaces with slow, natural blinks away from digital light.',
    },
  ],
  'posture-stretch': [
    {
      id: 'neck-side-stretch',
      type: 'posture-stretch',
      title: 'Gentle Neck Side Stretch',
      categoryLabel: 'Posture & Neck',
      firstWord: 'Neck Side',
      highlightWord: 'Stretch',
      subtitle: 'Slow, controlled lateral neck stretch to release cervical tension.',
      instruction: 'Gently tilt your ear toward your shoulder, hold 15s, and switch sides.',
      illustrationKey: 'neck-tilt',
      durationSeconds: 45,
      description: 'Alleviate tech-neck strain and trapezius stiffness with gentle lateral cervical tilts.',
    },
    {
      id: 'shoulder-rolls',
      type: 'posture-stretch',
      title: 'Shoulder Rolls & Release',
      categoryLabel: 'Posture & Neck',
      firstWord: 'Shoulder',
      highlightWord: 'Rolls',
      subtitle: 'Roll shoulders back in wide circular motions to undo desk slouching.',
      instruction: 'Inhale, lift shoulders up, and roll them backward in smooth circles.',
      illustrationKey: 'shoulder-roll',
      durationSeconds: 45,
      description: 'Reverses forward hunched shoulders, mobilizes scapulae, and opens chest wall.',
    },
    {
      id: 'posture-reset',
      type: 'posture-stretch',
      title: 'Seated Posture Reset',
      categoryLabel: 'Posture & Neck',
      firstWord: 'Posture',
      highlightWord: 'Reset',
      subtitle: 'Sit tall, drop shoulders down, retract chin lightly, and breathe deeply.',
      instruction: 'Sit tall with feet flat, pull shoulders back, and lengthen your spine.',
      illustrationKey: 'posture-reset',
      durationSeconds: 45,
      description: 'Align the spine into neutral ergonomic posture with relaxed shoulders and diaphragmatic breath.',
    },
  ],
  'stand-move': [
    {
      id: 'stand-overhead',
      type: 'stand-move',
      title: 'Standing Overhead Stretch',
      categoryLabel: 'Stand & Stretch',
      firstWord: 'Stand &',
      highlightWord: 'Stretch',
      subtitle: 'Rise from your seat, reach both arms upward, and elongate your spine.',
      instruction: 'Stand up tall, interlace fingers, and stretch arms overhead.',
      illustrationKey: 'stand-overhead',
      durationSeconds: 60,
      description: 'Decompresses the lumbar spine, elevates ribcage, and counteracts hours of static sitting.',
    },
    {
      id: 'stand-side-stretch',
      type: 'stand-move',
      title: 'Gentle Left-Right Side Stretch',
      categoryLabel: 'Stand & Stretch',
      firstWord: 'Side Body',
      highlightWord: 'Stretch',
      subtitle: 'Stand tall with feet apart, reach one arm overhead, and gently sway to the side.',
      instruction: 'Reach overhead and gently lean your torso left, then right.',
      illustrationKey: 'stand-side-stretch',
      durationSeconds: 60,
      description: 'Opens lateral rib cage, stretches intercostal muscles, and improves deep breathing capacity.',
    },
    {
      id: 'stand-chest-opener',
      type: 'stand-move',
      title: 'Standing Shoulder & Upper-Back Stretch',
      categoryLabel: 'Stand & Stretch',
      firstWord: 'Chest & Back',
      highlightWord: 'Stretch',
      subtitle: 'Clasp hands behind your back, squeeze shoulder blades, and gently expand chest.',
      instruction: 'Clasp hands behind back, draw shoulder blades together, and open chest.',
      illustrationKey: 'stand-chest-opener',
      durationSeconds: 60,
      description: 'Stretches anterior pectoralis and strengthens mid-back scapular retractors.',
    },
  ],
  'walking': [
    {
      id: 'walk-desk',
      type: 'walking',
      title: 'Step Away from Desk',
      categoryLabel: 'Walking Refresh',
      firstWord: 'Walking',
      highlightWord: 'Break',
      subtitle: 'Step away from your workstation for a 2-minute movement refresh.',
      instruction: 'Walk away from your desk and take a short walk.',
      illustrationKey: 'walking-break',
      durationSeconds: 120,
      description: 'Break prolonged static posture, stimulate venous return, and refresh concentration.',
    },
    {
      id: 'walk-stroll',
      type: 'walking',
      title: 'Short Indoor Stroll',
      categoryLabel: 'Walking Refresh',
      firstWord: 'Indoor',
      highlightWord: 'Stroll',
      subtitle: 'Take a relaxed stroll around your workspace, hallway, or up a flight of stairs.',
      instruction: 'Take a short indoor stroll down the hall or around the room.',
      illustrationKey: 'walk-stroll',
      durationSeconds: 120,
      description: 'Boosts cerebral blood flow, loosens hip flexors, and reduces physical fatigue.',
    },
    {
      id: 'walk-distant-gaze',
      type: 'walking',
      title: 'Walk & Distant View',
      categoryLabel: 'Walking Refresh',
      firstWord: 'Walk &',
      highlightWord: 'Horizon',
      subtitle: 'Walk away from digital screens and focus on distant views across the office or outside.',
      instruction: 'Walk away from the monitor and look at a distant object for 20 seconds.',
      illustrationKey: 'walk-distant-gaze',
      durationSeconds: 120,
      description: 'Combines full-body locomotion with optical divergence and retinal relaxation.',
    },
  ],
  'viewing-distance': [
    {
      id: 'viewing-distance-check',
      type: 'viewing-distance',
      title: 'Ergonomic Screen Distance',
      categoryLabel: 'Ergonomics',
      firstWord: 'Viewing',
      highlightWord: 'Distance',
      subtitle: 'Maintain an arm-length distance (50-70 cm) between your eyes and monitor.',
      instruction: 'Sit back comfortably and maintain arm-length distance from the screen.',
      illustrationKey: 'viewing-distance',
      durationSeconds: 15,
      description: 'Prevents excessive convergence and neck extension while working on digital displays.',
    },
  ],
};

export function getExerciseVariations(type: ReminderType): ExerciseVariation[] {
  return EXERCISE_VARIATIONS[type] || [];
}

export function getVariationForReminder(type: ReminderType, index = 0): ExerciseVariation {
  const vars = getExerciseVariations(type);
  if (vars.length === 0) {
    return {
      id: `${type}-default`,
      type,
      title: 'Mindful Break',
      categoryLabel: 'Wellness',
      firstWord: 'Mindful',
      highlightWord: 'Break',
      subtitle: 'Take a moment to reset and relax.',
      instruction: 'Take a mindful pause from screen work.',
      illustrationKey: 'stretch-break',
      durationSeconds: 30,
      description: 'Reset mental clarity and relieve physical strain.',
    };
  }
  const safeIndex = Math.abs(index) % vars.length;
  return vars[safeIndex];
}

export function getVariationById(id: string): ExerciseVariation | undefined {
  for (const list of Object.values(EXERCISE_VARIATIONS)) {
    const match = list.find((v) => v.id === id);
    if (match) return match;
  }
  return undefined;
}

export function getExerciseForReminder(type: string, variationIndex = 0): StretchExercise {
  const reminderType = type as ReminderType;
  const vars = EXERCISE_VARIATIONS[reminderType];
  if (vars && vars.length > 0) {
    const safeIndex = Math.abs(variationIndex) % vars.length;
    const v = vars[safeIndex];
    return {
      id: v.id,
      title: v.title,
      category:
        reminderType === 'eye-break'
          ? 'eye'
          : reminderType === 'posture-stretch'
          ? 'posture'
          : reminderType === 'stand-move'
          ? 'stretch'
          : 'movement',
      targetArea: v.categoryLabel,
      durationSeconds: v.durationSeconds,
      description: v.description,
      steps: [v.instruction],
      benefits: v.subtitle,
      illustrationKey: v.illustrationKey,
    };
  }

  switch (type) {
    case 'eye-break':
      return STRETCH_CATALOG[0];
    case 'posture-stretch':
      return STRETCH_CATALOG[2];
    case 'stand-move':
      return STRETCH_CATALOG[6];
    case 'walking':
      return STRETCH_CATALOG[7];
    case 'viewing-distance':
    default:
      return STRETCH_CATALOG[0];
  }
}
