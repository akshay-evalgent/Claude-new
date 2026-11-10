require "rake"
require "yaml"

# Rake tasks of the free backend (see lib/free/client.rb).
#
#   RUN=<run> rake free:queue[keyframes]   queue every pending request of one step without stopping at the first
#   SFX=<name> rake free:queue[sfx]        the same for a sound-effects list
#   rake free:kaggle                       run the queue on a Kaggle GPU and store the results
#   rake free:status                       what is queued, what is stored
module Free
  module Tasks
    extend Rake::DSL

    def self.queue(step_name)
      queued = []
      note = ->(label, error) { queued << label; warn "[free] #{label}: #{error.message}" }
      if step_name == "sfx"
        sfx = Media::Sfx.new
        model = Fal::Models::ElevenlabsSfx.new
        sfx.sounds.each do |sound, spec|
          next if spec["tone"] || File.exist?(sfx.wav(sound))
          negative = spec["negative"] || sfx.config["negative"]
          prompt = spec.fetch("prompt")
          prompt = "#{prompt}. Avoid: #{negative}" unless negative.to_s.strip.empty?
          duration = spec.fetch("duration", 2)
          loop_it = spec.fetch("loop", false)
          begin
            model.generate(prompt: prompt, duration: loop_it == true ? [duration, 30].min : duration,
                           loop: loop_it, prompt_influence: spec.fetch("prompt_influence", 0.3))
          rescue Free::Deferred => e
            note.call("sfx #{sound}", e)
          end
        end
        return queued
      end
      klass = Pipeline::ALL_STEPS.find { |s| s.key.to_s == step_name } or raise ArgumentError, "unknown step #{step_name}"
      step = klass.new
      if step.is_a?(Pipeline::ItemsStep)
        done = (step.project[step.key]&.dig("items") || {})
        step.specs.each do |name, spec|
          next if done[name] && File.exist?(done[name]["path"]) && ENV["FORCE"] != "1"
          next if ENV["ONLY"] && !ENV["ONLY"].split(",").include?(name)
          begin
            step.generate(name, spec)
          rescue Free::Deferred => e
            note.call("#{step_name} #{name}", e)
            if step_name == "keyframes" # a provisional item: shots can be queued against it in the same batch
              items = (step.project[step.key]&.dig("items") || {}).merge(name => { "url" => "file://#{e.future_file}", "path" => e.future_file, "provisional" => true })
              step.project.record(step.key, items: items)
            end
          end
        end
      else
        begin
          step.send(:submit) unless step.done? && ENV["FORCE"] != "1"
        rescue Free::Deferred => e
          note.call(step_name, e)
          # a provisional sheet url: keyframes can be queued against it in the same batch
          step.project.record(step.key, url: "file://#{e.future_file}", provisional: true) if step_name == "ref_base"
        end
      end
      queued
    end

    def self.install
      desc "Queue every pending request of a step for Kaggle: free:queue[ref_base|dialogue|music|keyframes|shots|sfx]"
      task("free:queue", [:step]) do |_, args|
        queued = queue(args[:step].to_s)
        puts JSON.pretty_generate(queued: queued)
      end
      desc "Run the queued requests on a Kaggle GPU (open models through WanGP) and store the results"
      task("free:kaggle") { sh(Free.python, Free::WORKER, "kaggle", *ENV["KAGGLE_ARGS"].to_s.split) }
      desc "Fetch the results of the last Kaggle batch again (after an interrupted wait)"
      task("free:collect") { sh(Free.python, Free::WORKER, "collect") }
      desc "Show queued and stored free-backend requests"
      task("free:status") { sh(Free.python, Free::WORKER, "status") }
    end
  end
end
