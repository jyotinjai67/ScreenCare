"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STRETCH_CATALOG = void 0;
exports.getExerciseForReminder = getExerciseForReminder;
exports.STRETCH_CATALOG = [
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
function getExerciseForReminder(type) {
    switch (type) {
        case 'eye-break':
            return exports.STRETCH_CATALOG[0]; // 20-20-20
        case 'posture-stretch':
            return exports.STRETCH_CATALOG[2]; // Neck relief or shoulder rolls
        case 'stand-move':
            return exports.STRETCH_CATALOG[6]; // Stand Up reset
        case 'walking':
            return exports.STRETCH_CATALOG[7]; // Walking break
        case 'viewing-distance':
        default:
            return exports.STRETCH_CATALOG[0];
    }
}
